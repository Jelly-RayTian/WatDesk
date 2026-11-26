import {loadState} from '../core/state';
import {desiredEvents,planSync,type Desired} from '../core/google-calendar';
import {GOOGLE_CLIENT_ID,GOOGLE_SCOPE,GOOGLE_CALENDAR_NAME,GOOGLE_HOSTS,GOOGLE_STORE_KEY} from '../core/google-config';
// Sign-in uses the OAuth implicit flow through chrome.identity.launchWebAuthFlow, so no client secret ships and no refresh token is stored.
// The 1-hour access token lives in session storage only; an expired one is renewed silently while the Google session lasts.
const KEY=GOOGLE_STORE_KEY,TOKEN='watdesk.google.token',API='https://www.googleapis.com/calendar/v3',MAX_OPS=250;
const googleHosts=GOOGLE_HOSTS;
export interface GoogleStore {connected:boolean;calendarId?:string;synced:Record<string,string>;lastSyncAt?:string;lastError?:string;count?:number}
const empty=():GoogleStore=>({connected:false,synced:{}});
export async function readGoogle():Promise<GoogleStore>{const v=(await chrome.storage.local.get(KEY))[KEY] as GoogleStore|undefined;return v&&typeof v==='object'&&v.synced&&typeof v.synced==='object'?{...empty(),...v}:empty()}
const write=(patch:Partial<GoogleStore>)=>readGoogle().then(s=>chrome.storage.local.set({[KEY]:{...s,...patch}}));
export const redirectUri=()=>chrome.identity.getRedirectURL();
export const googleConfigured=()=>GOOGLE_CLIENT_ID!=='';
export async function googleStatus(){const s=await readGoogle();return {...s,synced:undefined,configured:googleConfigured(),redirectUri:chrome.runtime?.id?`https://${chrome.runtime.id}.chromiumapp.org/`:'',permitted:await hasPermission()}}
export const hasPermission=()=>chrome.permissions.contains({permissions:['identity'],origins:googleHosts}).catch(()=>false);
export function authUrl(interactive:boolean,redirect=redirectUri()){
 const p=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,redirect_uri:redirect,response_type:'token',scope:GOOGLE_SCOPE,include_granted_scopes:'false',prompt:interactive?'select_account consent':'none'});
 return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
export function parseAuthResult(url:string|undefined){
 const hash=new URL(url||'https://x/').hash.slice(1);const p=new URLSearchParams(hash);
 const token=p.get('access_token');if(!token)throw Error(p.get('error')==='access_denied'?'google-denied':'google-auth');
 return {token,expires:Date.now()+(Number(p.get('expires_in'))||3600)*1000};
}
async function accessToken(interactive:boolean):Promise<string>{
 if(!googleConfigured())throw Error('google-not-configured');
 const saved=(await chrome.storage.session.get(TOKEN))[TOKEN] as {token:string;expires:number}|undefined;
 if(saved&&saved.expires-60000>Date.now())return saved.token;
 let url:string|undefined;
 try{url=await chrome.identity.launchWebAuthFlow({url:authUrl(interactive),interactive})}
 catch{throw Error(interactive?'google-denied':'google-reconnect')}
 const fresh=parseAuthResult(url);await chrome.storage.session.set({[TOKEN]:fresh});return fresh.token;
}
async function call(token:string,method:string,path:string,body?:unknown){
 const r=await fetch(`${API}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 if(r.status===401){await chrome.storage.session.remove(TOKEN);throw Error('google-reconnect')}
 return r;
}
const fail=async(r:Response)=>{const e=await r.json().catch(()=>null);const reason=e?.error?.errors?.[0]?.reason||e?.error?.status||'';throw Error(r.status===403&&/rate|quota/i.test(reason)?'google-rate':`google-http:${r.status}`)};
export async function ensureCalendar(token:string,zone:string,store:GoogleStore){
 if(store.calendarId){const r=await call(token,'GET',`/calendars/${encodeURIComponent(store.calendarId)}`);if(r.ok)return store.calendarId;if(r.status!==404&&r.status!==410)await fail(r)}
 const r=await call(token,'POST','/calendars',{summary:GOOGLE_CALENDAR_NAME,description:'Deadlines and exams from WatDesk',timeZone:zone});
 if(!r.ok)await fail(r);const id=(await r.json()).id as string;
 // A new calendar starts empty: forget what the old one held.
 await write({calendarId:id,synced:{}});return id;
}
async function upsert(token:string,cal:string,d:Desired){
 const c=encodeURIComponent(cal);
 const r=await call(token,'POST',`/calendars/${c}/events`,{...d.event,id:d.id});
 if(r.ok)return;if(r.status!==409)await fail(r);
 const u=await call(token,'PUT',`/calendars/${c}/events/${d.id}`,{...d.event,id:d.id});if(!u.ok)await fail(u);
}
let running:Promise<unknown>|undefined,again=false;
// Single flight: a request that arrives mid-run schedules exactly one more pass.
export function syncGoogle(interactive=false){
 if(running){again=true;return running}
 running=(async()=>{do{again=false;await runOnce(interactive)}while(again)})().finally(()=>{running=undefined});return running;
}
async function runOnce(interactive:boolean){
 const store=await readGoogle();if(!store.connected)return;
 try{
  if(!await hasPermission())throw Error('google-permission');
  const token=await accessToken(interactive);const state=await loadState();
  const cal=await ensureCalendar(token,state.settings.zone,store);
  const fresh=await readGoogle();const synced={...fresh.synced};
  const plan=planSync(await desiredEvents(state),synced);let ops=0;
  for(const d of plan.upserts){if(ops++>=MAX_OPS)break;await upsert(token,cal,d);synced[d.id]=d.hash}
  for(const id of plan.deletes){if(ops++>=MAX_OPS)break;const r=await call(token,'DELETE',`/calendars/${encodeURIComponent(cal)}/events/${id}`);if(!r.ok&&r.status!==404&&r.status!==410)await fail(r);delete synced[id]}
  const rest=plan.upserts.length+plan.deletes.length>MAX_OPS;
  await write({synced,calendarId:cal,count:Object.keys(synced).length,lastSyncAt:new Date().toISOString(),lastError:rest?'google-partial':undefined});
  if(rest)again=true;
 }catch(e){await write({lastError:e instanceof Error?e.message:String(e)});throw e}
}
export async function connectGoogle(){
 await accessToken(true);await write({connected:true,lastError:undefined});await syncGoogle(true);
}
export async function disconnectGoogle(){
 const saved=(await chrome.storage.session.get(TOKEN))[TOKEN] as {token:string}|undefined;
 if(saved)await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(saved.token)}`,{method:'POST'}).catch(()=>{});
 await chrome.storage.session.remove(TOKEN);await chrome.storage.local.remove(KEY);
}
