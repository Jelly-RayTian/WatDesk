import {it,expect,vi,beforeEach} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
const mem:Record<string,any>={},session:Record<string,any>={};
const store=(m:Record<string,any>)=>({get:async(k:string)=>({[k]:m[k]}),set:async(o:Record<string,any>)=>{Object.assign(m,structuredClone(o))},remove:async(k:string)=>{delete m[k]}});
let flow=vi.fn();
beforeEach(()=>{
 for(const m of [mem,session])for(const k of Object.keys(m))delete m[k];
 flow=vi.fn(async()=>'https://abc.chromiumapp.org/#access_token=tok&expires_in=3600&token_type=Bearer');
 (globalThis as any).chrome={storage:{local:store(mem),session:store(session)},permissions:{contains:async()=>true},identity:{getRedirectURL:()=>'https://abc.chromiumapp.org/',launchWebAuthFlow:flow},runtime:{id:'abc'}};
});
const entry=(n:number):Entry=>({id:'learn:'+n,platform:'learn',course:'CS 135',title:'A'+n,type:'task',start:null,end:null,due:new Date(Date.now()+86400000*(n+1)).toISOString(),status:'open',url:''});
const withClient=async()=>{vi.resetModules();vi.doMock('../src/core/google-config',async orig=>({...(await orig<any>()),GOOGLE_CLIENT_ID:'client.apps.googleusercontent.com'}));return import('../src/background/google-calendar')};
function api(handler:(m:string,u:string,b:any)=>{status:number;body?:any}){
 const calls:Array<[string,string,any]>=[];
 (globalThis as any).fetch=vi.fn(async(url:string,init:any={})=>{const b=init.body?JSON.parse(init.body):undefined;const m=init.method||'GET';calls.push([m,url.replace('https://www.googleapis.com/calendar/v3',''),b]);const r=handler(m,url,b);return new Response(JSON.stringify(r.body??{}),{status:r.status})});
 return calls;
}
it('parses the OAuth result and builds a least-privilege URL',async()=>{
 const g=await withClient();
 expect(g.parseAuthResult('https://abc.chromiumapp.org/#access_token=t&expires_in=100').token).toBe('t');
 expect(()=>g.parseAuthResult('https://abc.chromiumapp.org/#error=access_denied')).toThrow('google-denied');
 expect(()=>g.parseAuthResult(undefined)).toThrow('google-auth');
 const u=new URL(g.authUrl(false,'https://abc.chromiumapp.org/'));expect(u.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.app.created');expect(u.searchParams.get('prompt')).toBe('none');expect(u.searchParams.get('response_type')).toBe('token');
});
it('creates the WatDesk calendar, upserts events idempotently and deletes removed ones',async()=>{
 const g=await withClient();const s=emptyState();s.entries=[entry(1),entry(2)];mem.watdesk=s;
 let conflict=true;
 const calls=api((m,u)=>{
  if(m==='POST'&&u.endsWith('/calendars'))return {status:200,body:{id:'cal1'}};
  if(m==='POST'&&u.includes('/events'))return conflict?(conflict=false,{status:409}):{status:200};
  return {status:200};
 });
 await g.connectGoogle();
 expect(flow).toHaveBeenCalledTimes(1);expect(flow.mock.calls[0][0].interactive).toBe(true);
 const posts=calls.filter(c=>c[0]==='POST'&&c[1].includes('/events'));expect(posts).toHaveLength(2);// the 409 conflict is retried as a PUT
 expect(calls.some(c=>c[0]==='PUT')).toBe(true);expect(calls[0][2].summary).toBe('WatDesk');
 let st=await g.readGoogle();expect(st).toMatchObject({connected:true,calendarId:'cal1',count:2});expect(Object.keys(st.synced)).toHaveLength(2);
 // Second run: nothing changed -> no event writes. Remove one entry -> exactly one delete.
 calls.length=0;await g.syncGoogle();expect(calls.filter(c=>c[1].includes('/events'))).toHaveLength(0);
 mem.watdesk={...s,entries:[entry(1)]};calls.length=0;await g.syncGoogle();
 expect(calls.filter(c=>c[0]==='DELETE')).toHaveLength(1);expect(Object.keys((await g.readGoogle()).synced)).toHaveLength(1);
});
it('recreates a calendar the user deleted and asks to reconnect on 401',async()=>{
 const g=await withClient();const s=emptyState();s.entries=[entry(1)];mem.watdesk=s;mem['watdesk.google']={connected:true,calendarId:'old',synced:{x:'y'}};
 const calls=api((m,u)=>{if(m==='GET'&&u.includes('/calendars/old'))return {status:404};if(m==='POST'&&u.endsWith('/calendars'))return {status:200,body:{id:'new'}};return {status:200}});
 await g.syncGoogle();let st=await g.readGoogle();expect(st.calendarId).toBe('new');expect(st.synced.x).toBeUndefined();
 session['watdesk.google.token']={token:'tok',expires:Date.now()+3600000};
 api(()=>({status:401}));mem.watdesk={...s,entries:[entry(1),entry(2)]};
 await expect(g.syncGoogle()).rejects.toThrow('google-reconnect');expect((await g.readGoogle()).lastError).toBe('google-reconnect');expect(session['watdesk.google.token']).toBeUndefined();
});
it('does nothing when disconnected, refuses without a client or permission, and disconnect revokes and forgets',async()=>{
 const g=await withClient();const calls=api(()=>({status:200}));await g.syncGoogle();expect(calls).toHaveLength(0);
 mem['watdesk.google']={connected:true,synced:{}};(globalThis as any).chrome.permissions.contains=async()=>false;
 await expect(g.syncGoogle()).rejects.toThrow('google-permission');
 session['watdesk.google.token']={token:'tok',expires:Date.now()+3600000};await g.disconnectGoogle();
 expect(calls.some(c=>c[0]==='POST'&&c[1].startsWith('https://oauth2'))||(globalThis as any).fetch.mock.calls.some((c:any)=>String(c[0]).startsWith('https://oauth2.googleapis.com/revoke?token=tok'))).toBe(true);
 expect(mem['watdesk.google']).toBeUndefined();expect(session['watdesk.google.token']).toBeUndefined();
 vi.doMock('../src/core/google-config',async orig=>({...(await orig<any>()),GOOGLE_CLIENT_ID:''}));vi.resetModules();const plain=await import('../src/background/google-calendar');mem['watdesk.google']={connected:true,synced:{}};(globalThis as any).chrome.permissions.contains=async()=>true;
 await expect(plain.syncGoogle()).rejects.toThrow('google-not-configured');
});
