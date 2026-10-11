export const schoolOrigin='https://adfs.uwaterloo.ca/*';
const scriptId='watdesk-school-next';
let tail:Promise<void>=Promise.resolve();
export function configureSchoolLogin(enabled:boolean){const job=tail.then(()=>applySchoolLogin(enabled));tail=job.catch(()=>{});return job}
async function applySchoolLogin(enabled:boolean){
 const registered=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId]});
 if(!enabled){if(registered.length){await chrome.scripting.unregisterContentScripts({ids:[scriptId]});const tabs=await chrome.tabs.query({url:schoolOrigin});await Promise.allSettled(tabs.filter(t=>t.id!=null).map(t=>chrome.scripting.executeScript({target:{tabId:t.id!},func:()=>{window.dispatchEvent(new Event('watdesk-school-login-stop'));delete document.documentElement.dataset.watdeskSchoolLogin}})))}return}
 if(!await chrome.permissions.contains({origins:[schoolOrigin]}))throw Error('school-login-permission');
 if(!registered.length)await chrome.scripting.registerContentScripts([{id:scriptId,matches:[schoolOrigin],js:['school-login.js'],runAt:'document_idle',persistAcrossSessions:true}]);
 // Also handles a sign-in page already open when permission is enabled.
 const tabs=await chrome.tabs.query({url:schoolOrigin});
 await Promise.allSettled(tabs.filter(t=>t.id!=null).map(t=>chrome.scripting.executeScript({target:{tabId:t.id!},files:['school-login.js']})));
}
