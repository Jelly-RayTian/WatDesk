import type {SourcePlatform} from './source-tabs';
import {waitForTab,retryFrame} from '../core/sync';
// Serialized into an authorized platform page. Credentials are never read.
export async function clickPlatformLogin(p:string){
 const hosts:Record<string,string>={learn:'learn.uwaterloo.ca',crowdmark:'app.crowdmark.com',odyssey:'odyssey.uwaterloo.ca'};
 if(location.hostname!==hosts[p])return 'outside-platform';
 const authPath=/sign[-_]?in|login|auth|saml/i.test(location.pathname);
 if(p==='crowdmark'&&/^\/sign[-_]?in(?:\/|$)/i.test(location.pathname)&&location.pathname!=='/sign-in/waterloo')return 'waterloo-entry';
 if(document.querySelector('input[type="password"],input[autocomplete="one-time-code"]'))return 'manual-login';
 const label=(el:Element)=>(el.getAttribute('aria-label')||el.textContent||'').replace(/[^a-z\u4e00-\u9fff\s]/gi,' ').replace(/\s+/g,' ').trim();
 for(let n=0;n<(authPath?10:1);n++){
  const controls=[...document.querySelectorAll<HTMLElement>('a[href],button,input[type="submit"],[role="button"]')];
  const control=controls.find(el=>{
   if(el.hasAttribute('disabled')||el.getAttribute('aria-disabled')==='true'||el.hidden)return false;
   const text=label(el)||(el instanceof HTMLInputElement?el.value:'');
   const match=p==='crowdmark'?/^sign in (?:with|via) learn$/i.test(text):/^(?:log ?in|sign ?in)(?: to (?:learn|odyssey))?$|^(?:waterloo|university of waterloo) (?:log ?in|sign ?in)$|^登录$/i.test(text);
   if(!match)return false;
   if(el instanceof HTMLAnchorElement)return (p==='crowdmark'?el.origin===location.origin&&/^\/auth\//.test(el.pathname):['learn.uwaterloo.ca','odyssey.uwaterloo.ca','adfs.uwaterloo.ca'].includes(el.hostname)&&/login|saml|auth|adfs/i.test(el.pathname));
   // Non-link controls are accepted only on the platform's authentication page.
   return authPath;
  });
  if(control){if(control.dataset.watdeskLoginStarted)return 'waiting-login';control.dataset.watdeskLoginStarted='true';control.click();return 'started'}
  if(n<9&&authPath)await new Promise(r=>setTimeout(r,100));
 }
 return authPath||document.querySelector('input[autocomplete="username"]')?'manual-login':'ready';
}
const jobs=new Map<number,Promise<void>>();
export function autoLogin(p:SourcePlatform,tabId:number,check:()=>void=()=>{}):Promise<void>{
 if(p==='cs135'||p==='mobius')return Promise.resolve();
 const existing=jobs.get(tabId);if(existing)return existing;
 const job=(async()=>{
  let clickedAt='';const deadline=Date.now()+30000;
  for(let n=0;n<60&&Date.now()<deadline;n++){
   check();await waitForTab(tabId);check();
   let action:string|undefined;
   try{const [result]=await retryFrame(()=>chrome.scripting.executeScript({target:{tabId},func:clickPlatformLogin,args:[p]}),()=>waitForTab(tabId));action=result?.result}catch{
    // A school SSO redirect is outside our host permissions. Wait for it to return.
    check();await new Promise(r=>setTimeout(r,500));continue;
   }
   check();if(action==='ready')return;
   if(action==='manual-login')throw Error('sign-in-required');
   if(action==='waterloo-entry'){await chrome.tabs.update(tabId,{url:'https://app.crowdmark.com/sign-in/waterloo'});clickedAt='';continue}
   if(action==='started'){
    const url=(await chrome.tabs.get(tabId)).url||'';
    if(clickedAt===url)throw Error('sign-in-required');clickedAt=url;
   }
   await new Promise(r=>setTimeout(r,500));
  }
  throw Error('sign-in-required');
 })().finally(()=>jobs.delete(tabId));jobs.set(tabId,job);return job;
}
