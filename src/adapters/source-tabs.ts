import {origins,urls,type Platform} from '../domain';
export type SourcePlatform=Exclude<Platform,'manual'>;
const remembered=new Map<SourcePlatform,number>();
const opening=new Map<SourcePlatform,Promise<number>>();
// A single tab acquisition per source, shared by sync and the Open button.
export async function sourceTab(p:SourcePlatform,activate=false):Promise<number>{
 let job=opening.get(p);
 if(!job){job=(async()=>{
  const tabs=await chrome.tabs.query({url:p==='cs135'?'https://student.cs.uwaterloo.ca/~cs135/*':origins[p]});
  tabs.sort((a,b)=>Number(b.url?.startsWith(urls[p]))-Number(a.url?.startsWith(urls[p]))||Number(b.active)-Number(a.active));
  const previous=remembered.get(p);
  const tab=tabs[0]||(previous?await chrome.tabs.get(previous).catch(()=>undefined):undefined);
  if(tab?.id){remembered.set(p,tab.id);if(tab.discarded)await chrome.tabs.reload(tab.id);return tab.id}
  const created=await chrome.tabs.create({url:urls[p],active:false});
  if(!created.id)throw Error('needs-page');remembered.set(p,created.id);return created.id;
 })().finally(()=>opening.delete(p));opening.set(p,job)}
 const id=await job;
 if(activate){const tab=await chrome.tabs.get(id);await chrome.tabs.update(id,{active:true,...(tab.url!==urls[p]?{url:urls[p]}:{})});if(tab.windowId!=null)await chrome.windows.update(tab.windowId,{focused:true})}
 return id;
}
