import {withTimeout} from '../core/sync';
const matches=['https://app.crowdmark.com/*'];
const id='watdesk-crowdmark-bridge';
const file='crowdmark-bridge.js';
// Optional registration and tab messaging follow WATnow background.js.
export async function ensureCrowdmarkBridge(){
 if(!await chrome.permissions.contains({origins:matches}))return;
 const registered=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
 if(!registered.length)await chrome.scripting.registerContentScripts([{id,matches,js:[file],runAt:'document_end',persistAcrossSessions:true}]);
 const tabs=await chrome.tabs.query({url:matches});
 for(const tab of tabs){if(!tab.id||tab.discarded||tab.frozen||tab.status!=='complete')continue;try{await withTimeout(chrome.scripting.executeScript({target:{tabId:tab.id},files:[file]}),5000)}catch{/* Navigating tabs get the registered bridge at document_end. */}}
}
export async function crowdmarkRelay(path:string){
 let url:URL;try{url=new URL(path,'https://app.crowdmark.com')}catch{throw Error('path')}
 if(url.origin!=='https://app.crowdmark.com'||!url.pathname.startsWith('/api/v2/student/'))throw Error('path');
 let tabs:chrome.tabs.Tab[];try{tabs=await chrome.tabs.query({url:matches})}catch{return {noTab:true}}
 tabs.sort((a,b)=>Number(b.active)-Number(a.active)||(b.lastAccessed||0)-(a.lastAccessed||0));
 for(const tab of tabs){if(!tab.id||tab.discarded||tab.frozen||tab.status!=='complete')continue;try{const res=await withTimeout(chrome.tabs.sendMessage(tab.id,{type:'crowdmark:fetch',path:url.pathname+url.search}),22000);if(res)return res}catch{/* Try another already-open tab. */}}
 return {noTab:true};
}
