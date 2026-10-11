const matches=['https://app.crowdmark.com/*'];
const id='watdesk-crowdmark-bridge';
const file='crowdmark-bridge.js';
// Optional registration and tab messaging follow WATnow background.js.
export async function ensureCrowdmarkBridge(){
 if(!await chrome.permissions.contains({origins:matches}))return;
 const registered=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
 if(!registered.length)await chrome.scripting.registerContentScripts([{id,matches,js:[file],runAt:'document_end',persistAcrossSessions:true}]);
 const tabs=await chrome.tabs.query({url:matches});
 for(const tab of tabs){if(!tab.id||tab.discarded)continue;try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:[file]})}catch{/* Navigating tabs get the registered bridge at document_end. */}}
}
export async function crowdmarkRelay(path:string){
 if(!path.startsWith('/api/v2/student/')||path.includes('..'))throw Error('path');
 let tabs:chrome.tabs.Tab[];try{tabs=await chrome.tabs.query({url:matches})}catch{return {noTab:true}}
 tabs.sort((a,b)=>Number(b.active)-Number(a.active)||(b.lastAccessed||0)-(a.lastAccessed||0));
 for(const tab of tabs){if(!tab.id||tab.discarded)continue;try{const res=await chrome.tabs.sendMessage(tab.id,{type:'crowdmark:fetch',path});if(res)return res}catch{/* Try another already-open tab. */}}
 return {noTab:true};
}
