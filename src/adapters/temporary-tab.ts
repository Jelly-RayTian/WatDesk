import {withTimeout} from '../core/sync';
export interface TemporaryPage {id:number;check:()=>void}
const owned=new Set<number>();
export const isTemporaryTab=(id:number)=>owned.has(id);
// Never reuse, activate or close a user tab. Bound the full renderer lifetime.
export async function withTemporaryTab<T>(url:string,read:(page:TemporaryPage)=>Promise<T>,options:{signal?:AbortSignal;timeout?:number}={}):Promise<T>{
 let id:number|undefined,ended=false;
 const check=()=>{if(ended||options.signal?.aborted)throw Error('sync-cancelled')};
 let abort!:()=>void;
 const aborted=new Promise<never>((_,reject)=>{abort=()=>reject(Error('sync-cancelled'))});
 options.signal?.addEventListener('abort',abort,{once:true});
 try{
  check();
  const opening=chrome.tabs.create({url,active:false}).then(async tab=>{
   if(tab.id==null)throw Error('needs-page');
   if(ended||options.signal?.aborted){await chrome.tabs.remove(tab.id).catch(()=>{});throw Error('sync-cancelled')}
   id=tab.id;owned.add(id);check();return id;
  });
  return await withTimeout(Promise.race([opening.then(async id=>{check();return read({id,check})}),aborted]),options.timeout??120000);
 }finally{
  ended=true;options.signal?.removeEventListener('abort',abort);
  if(id!=null){await chrome.tabs.remove(id).catch(()=>{});owned.delete(id)}
 }
}
