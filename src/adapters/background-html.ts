import {withTimeout} from '../core/sync';
export type HtmlKind='rows'|'odyssey'|'cs135';
let parsing:Promise<unknown>=Promise.resolve();
// Serialize the short-lived local parser so one caller cannot close another's document.
export function parseBackgroundHtml<T>(kind:HtmlKind,html:string):Promise<T>{
 if(html.length>2000000)return Promise.reject(Error('html-too-large'));
 const job=parsing.then(async()=>{
  const url=chrome.runtime.getURL('offscreen.html');
  try{
   const contexts=await chrome.runtime.getContexts({contextTypes:[chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],documentUrls:[url]});
   if(!contexts.length)await chrome.offscreen.createDocument({url:'offscreen.html',reasons:[chrome.offscreen.Reason.DOM_PARSER],justification:'Parse course schedules and submission metadata without browser tabs.'});
   const reply=await withTimeout(chrome.runtime.sendMessage({target:'offscreen',kind,html}),10000);
   if(!reply?.ok)throw Error(reply?.error||'parse');return reply.value as T;
  }finally{await chrome.offscreen.closeDocument().catch(()=>{})}
 });parsing=job.catch(()=>{});return job;
}
export async function backgroundHtml(url:string){
 const r=await fetch(url,{credentials:'include',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(r.type==='opaqueredirect'||r.status>=300&&r.status<400||r.status===401||r.status===403)throw Error('signed-out');
 if(!r.ok)throw Error('http:'+r.status);
 if(!r.headers.get('content-type')?.includes('text/html'))throw Error('expected-html');
 const html=await r.text();if(html.length>2000000)throw Error('html-too-large');return html;
}
