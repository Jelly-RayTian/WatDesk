import type {AppState} from '../domain';
export async function retryFrame<T>(read:()=>Promise<T>,wait:()=>Promise<void>){
 for(let attempt=0;;attempt++){try{return await read()}catch(e){if(attempt>=2||!/frame.*removed|frame.*not found|document.*unloaded|context.*invalidated/i.test(e instanceof Error?e.message:String(e)))throw e;await wait()}}
}
export async function withTimeout<T>(read:Promise<T>,ms:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([read,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('sync-timeout')),ms)})])}finally{clearTimeout(timer)}}
export function recoverInterrupted(s:AppState):AppState{
 const interrupted=Object.entries(s.sources).find(([,st])=>st.status==='syncing'||st.phase)?.[0];
 const run=s.syncRun;
 return {...s,syncRun:run&&!run.finished?{...run,finished:true,active:undefined,failed:(run.active||interrupted||run.targets.find(p=>!run.completed.includes(p))) as typeof run.failed}:run,sources:Object.fromEntries(Object.entries(s.sources).map(([p,status])=>[p,status.status==='syncing'||status.phase?{...status,phase:undefined,status:'error',error:'sync-interrupted'}:status]))};
}
export async function waitForTab(tabId:number){
 for(let n=0;n<80;n++){const tab=await chrome.tabs.get(tabId);if(tab.status==='complete')return;await new Promise(r=>setTimeout(r,250))}throw Error('page-load-timeout');
}
