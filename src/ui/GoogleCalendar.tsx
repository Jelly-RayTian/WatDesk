import {useEffect,useState} from 'react';
import {CalendarCheck} from '@phosphor-icons/react';
import type {AppState} from '../domain';
import {GOOGLE_HOSTS,GOOGLE_STORE_KEY} from '../core/google-config';
interface Status {connected:boolean;calendarId?:string;lastSyncAt?:string;lastError?:string;count?:number;configured:boolean;redirectUri:string;permitted:boolean}
const errorText=(e:string|undefined,zh:boolean)=>{
 if(!e)return '';
 const m:Record<string,[string,string]>={
  'google-denied':['未完成 Google 授权。','Google sign-in was not completed.'],
  'google-reconnect':['Google 登录已过期，请点“立即同步”重新授权。','Your Google sign-in expired. Press Sync now to sign in again.'],
  'google-permission':['需要重新允许访问 Google 日历。请断开后重新连接。','Access to Google Calendar is no longer granted. Disconnect and connect again.'],
  'google-rate':['Google 暂时限流，稍后会自动重试。','Google is rate limiting requests; WatDesk will retry later.'],
  'google-partial':['事项较多，已同步一部分，其余会继续同步。','Many items: part were synced and the rest will follow.'],
  'google-not-configured':['此版本还没有配置 Google 客户端。','This build has no Google client configured.'],
  'google-auth':['Google 没有返回有效授权，请重试。','Google did not return a valid sign-in. Try again.']};
 return (m[e]||[])[zh?0:1]||(/^google-http:403/.test(e)?(zh?'Google 拒绝了请求（403）。请确认已在 Google Cloud 启用 Calendar API，且你在测试用户名单里。':'Google refused the request (403). Check that the Calendar API is enabled and you are a test user.'):e);
};
export function GoogleCalendar({state,perform}:{state:AppState;perform:(type:string,args?:object)=>Promise<any>}){
 const zh=state.settings.locale==='zh-CN';
 const [s,setS]=useState<Status|null>(null),[busy,setBusy]=useState(false);
 const refresh=async()=>{const v=await perform('googleStatus');if(v)setS(v)};
 useEffect(()=>{void refresh();const changed=(c:Record<string,chrome.storage.StorageChange>)=>{if(c[GOOGLE_STORE_KEY])void refresh()};chrome.storage.onChanged.addListener(changed);return()=>chrome.storage.onChanged.removeListener(changed)},[]);
 if(!s)return null;
 const run=async(type:string,beforeRun?:()=>Promise<boolean>)=>{setBusy(true);try{if(beforeRun&&!await beforeRun())return;await perform(type)}finally{setBusy(false);void refresh()}};
 const connect=()=>run('googleConnect',()=>chrome.permissions.request({permissions:['identity'],origins:GOOGLE_HOSTS}));
 return <section className="settings-section google-calendar"><h2><CalendarCheck size={20}/>{zh?'Google 日历':'Google Calendar'}</h2>
  <p className="small muted">{zh?'把截止事项和考试单向同步到你 Google 账号里一个名为“WatDesk”的独立日历。只能访问这个日历，不会读取你的其他日历；日历里的修改会被下次同步覆盖。':'Mirrors deadlines and exams one way into a separate calendar named "WatDesk" in your Google account. It can only access that calendar, never your other calendars; edits made there are overwritten by the next sync.'}</p>
  {!s.configured?<p className="small">{zh?'这个版本尚未配置 Google 客户端，暂时无法连接。':'This build has no Google client configured yet, so it cannot connect.'}</p>
  :s.connected?<>
   <p className="small">{s.lastSyncAt?(zh?`上次同步 ${new Date(s.lastSyncAt).toLocaleString(state.settings.locale)} · ${s.count??0} 项`:`Last synced ${new Date(s.lastSyncAt).toLocaleString(state.settings.locale)} · ${s.count??0} items`):(zh?'已连接，尚未同步。':'Connected; not synced yet.')}</p>
   {s.lastError&&<p role="alert" className="small danger">{errorText(s.lastError,zh)}</p>}
   <div className="button-stack"><button className="button primary" disabled={busy} onClick={()=>void run('googleSync')}>{busy?(zh?'同步中…':'Syncing…'):(zh?'立即同步':'Sync now')}</button><button className="button secondary" disabled={busy} onClick={()=>void run('googleDisconnect')}>{zh?'断开连接':'Disconnect'}</button></div>
   <p className="small muted">{zh?'断开会撤销授权并停止同步；已写入的“WatDesk”日历和事件会保留，可在 Google 日历里自行删除。':'Disconnecting revokes access and stops syncing. The "WatDesk" calendar and its events stay; delete the calendar in Google Calendar if you no longer want it.'}</p>
  </>:<>
   {s.lastError&&<p role="alert" className="small danger">{errorText(s.lastError,zh)}</p>}
   <button className="button primary" disabled={busy} onClick={()=>void connect()}>{busy?(zh?'连接中…':'Connecting…'):(zh?'连接 Google 日历':'Connect Google Calendar')}</button>
  </>}
  <details className="small muted"><summary>{zh?'配置信息':'Setup details'}</summary><p>{zh?'在 Google Cloud 的 OAuth 客户端（Web 应用）里，需把下面的地址加入“已获授权的重定向 URI”：':'In the Google Cloud OAuth client (Web application), add this to Authorized redirect URIs:'}</p><code>{s.redirectUri}</code></details>
 </section>;
}
