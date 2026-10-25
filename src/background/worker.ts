import {emptyState,platforms,urls,origins,type AppState,type Platform,type Entry} from '../domain';
import {loadState,mutateState,applySnapshot,clearSource} from '../core/state';
import {planReminders,exportIcs,validateBackup,safeUrl} from '../core/util';
import {readPlatform} from '../adapters/read';
import {withTimeout,recoverInterrupted} from '../core/sync';
import {SyncFence} from '../core/fence';
import {sourceTab,existingSourceTab} from '../adapters/source-tabs';
import {configureSchoolLogin} from './school-login';
import {autoLogin} from '../adapters/login';
import {waitForTab} from '../core/sync';
import {enabledPlatforms} from '../core/onboarding';
import {pendingExamChanges} from '../core/organization';
import {syncMinutes,configureSyncSchedule} from './sync-schedule';
import {canReuseSource} from '../core/refresh-policy';
const fence=new SyncFence();const syncJobs=new Map<string,{job:Promise<void>;interactive:boolean}>();
const ready=mutateState(recoverInterrupted);
void ready.then(async s=>{await configureSchoolLogin(s.settings.schoolAutoNext===true);await configureSyncSchedule(s.settings)}).catch(()=>{});
let openedRun:Promise<unknown>|undefined;let openedInteractive=false;
async function refreshOnOpen(forceGrades=false,interactive?:boolean,scheduled=false){
 await ready;interactive??=forceGrades||!(await loadState()).settings.onboardingComplete;
 if(openedRun){if(interactive&&!openedInteractive){await openedRun;return refreshOnOpen(forceGrades,interactive,scheduled)}return openedRun}
 openedInteractive=interactive;
 openedRun=(async()=>{
  const targets:Exclude<Platform,'manual'>[]=[];
  for(const p of enabledPlatforms(await loadState())){
   if(!forceGrades&&syncMinutes((await loadState()).settings)===0)continue;
   if(!await chrome.permissions.contains({origins:[origins[p]]}))continue;
   targets.push(p);
  }
  await mutateState(s=>({...s,syncRun:{started:Date.now(),targets,completed:[],reused:[],finished:false}}));
  await Promise.allSettled(targets.map(async p=>{
   const state=await loadState();
   if(!scheduled&&canReuseSource(p,state.sources[p],forceGrades,Date.now(),syncMinutes(state.settings))){
    await mutateState(s=>({...s,syncRun:{...s.syncRun!,completed:[...new Set([...s.syncRun!.completed,p])],reused:[...s.syncRun!.reused||[],p]}}));return;
   }
   await sync(p,forceGrades,interactive);
   await mutateState(s=>({...s,syncRun:{...s.syncRun!,...(s.sources[p]?.status==='ok'?{completed:[...new Set([...s.syncRun!.completed,p])]}:{failed:s.syncRun!.failed||p})}}));
  }));
  await mutateState(s=>({...s,syncRun:{...s.syncRun!,finished:true}}));
 })();try{await openedRun}finally{openedRun=undefined}
}
function sync(p:Exclude<Platform,'manual'>,forceGrades=true,interactive=true):Promise<void>{
 const running=syncJobs.get(p);
 if(running)return interactive&&!running.interactive?running.job.then(()=>sync(p,forceGrades,interactive)):running.job;
 const job=runSync(p,forceGrades,interactive).finally(()=>syncJobs.delete(p));syncJobs.set(p,{job,interactive});return job;
}
async function runSync(p:Exclude<Platform,'manual'>,forceGrades:boolean,interactive:boolean){
 await ready;if(!interactive&&syncMinutes((await loadState()).settings)===0)return;if(p==='mobius'&&(await loadState()).settings.mobiusEnabled!==true)return;
 if(p==='cs135'&&(await loadState()).settings.cs135Enabled!==true)return;
 const token=fence.capture(p);const started=Date.now();let cancelled=false;const current=()=>!cancelled&&fence.current(p,token);
 try{
  await mutateState(s=>({...s,sources:{...s.sources,[p]:{...s.sources[p],attempt:new Date().toISOString(),phase:'page',status:'syncing'}}}));
  const result=await withTimeout((async()=>{
   // Sync never acquires, activates, reloads or navigates a browser tab.
   const tabId=await existingSourceTab(p);
   if(p==='mobius'&&tabId==null)throw Error('mobius-settings-required');
   if(!current())throw Error('sync-cancelled');
   await mutateState(s=>current()?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:'tasks'}}}:s);
   return readPlatform(p,await loadState(),forceGrades,tabId);
  })(),interactive?180000:45000);
  await mutateState(s=>current()?applySnapshot(s,p,result.entries,result.courses,{status:'ok',at:new Date().toISOString(),count:result.entries.length,identity:result.identity,error:result.warning||(p==='crowdmark'&&/^crowdmark-(?:grades|archive)/.test(s.sources[p]?.error||'')?s.sources[p]?.error:undefined),...(p==='learn'?{gradesAt:result.gradesAt,issues:result.issues,courseReadAt:result.courseReadAt}:{})}):s);

 }catch(e){await mutateState(s=>current()?({...s,sources:{...s.sources,[p]:{...s.sources[p],phase:undefined,status:'error',error:e instanceof Error?e.message:String(e),durationMs:Date.now()-started}}}):s);cancelled=true}
 finally{await mutateState(s=>current()?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:undefined,durationMs:Date.now()-started}}}:s);void notify().catch(()=>{})}
}
async function notifyExamChanges(){const state=await loadState();for(const {change,entry,key} of pendingExamChanges(state)){await chrome.notifications.create(key,{type:'basic',iconUrl:'icon.png',title:`${entry.course} ${entry.title}`,message:state.settings.locale==='zh-CN'?'考试时间、教室或座位有更新，请打开 WatDesk 核对。':'Exam time, room or seat changed. Open WatDesk to review.'});await mutateState(s=>({...s,sent:{...s.sent,[key]:change.at}}))}}
let notifying=false;
async function notify(){if(notifying)return;notifying=true;try{await notifyExamChanges();const s=await loadState();for(const r of planReminders(s,new Date().toISOString())){await chrome.notifications.create(r.key,{type:'basic',iconUrl:'icon.png',title:`${r.entry.course} ${r.entry.title}`,message:s.settings.locale==='zh-CN'?`${r.entry.category==='class'?'课程将在':r.entry.type==='exam'?'考试将在':'任务将在'} ${r.lead} 分钟${r.entry.type==='exam'?'后开始':'后截止'}。`:`${r.entry.category==='class'?'Class':r.entry.type==='exam'?'Exam':'Deadline'} within ${r.lead} minutes.`});await mutateState(state=>({...state,sent:{...state.sent,[r.key]:new Date().toISOString()}}))}}finally{notifying=false}}
async function handle(msg:any){await ready;switch(msg.type){
 case 'refreshOnOpen':void refreshOnOpen(msg.force===true).catch(()=>{});return {ok:true};
 case 'state':return loadState();
 case 'sync':if(platforms.includes(msg.platform)){void sync(msg.platform);return {ok:true}}throw Error('platform');
 case 'schoolLogin':{if(typeof msg.enabled!=='boolean')throw Error('invalid');await configureSchoolLogin(msg.enabled);return mutateState(s=>({...s,settings:{...s.settings,schoolAutoNext:msg.enabled}}))}
 case 'settings':{if(msg.patch?.mobiusEnabled===false)fence.invalidate('mobius');if(msg.patch?.cs135Enabled===false)fence.invalidate('cs135');const saved=await mutateState(s=>{const settings={...s.settings,...msg.patch};const next=validateBackup(JSON.stringify({...s,settings}));if(msg.patch?.mobiusEnabled===false&&next.sources.mobius)next.sources.mobius={...next.sources.mobius,phase:undefined,status:next.sources.mobius.at?'ok':'idle',error:undefined};if(msg.patch?.cs135Enabled===false&&next.sources.cs135)next.sources.cs135={...next.sources.cs135,phase:undefined,status:next.sources.cs135.at?'ok':'idle',error:undefined};return next});await configureSyncSchedule(saved.settings);return saved;}
 case 'overlay':return mutateState(s=>{const ids=Array.isArray(msg.ids)?msg.ids:[msg.id];const overlays={...s.overlays};for(const id of ids)if(s.entries.some(e=>e.id===id))overlays[id]={...overlays[id],...msg.patch};return {...s,overlays}});
 case 'manual':return mutateState(s=>{const entry=msg.entry as Entry;if(entry.platform!=='manual'||!entry.title.trim()||!safeUrl(entry.url)||!['exam','task'].includes(entry.type))throw Error('invalid');const next={...s,entries:[...s.entries.filter(e=>e.id!==entry.id),entry]};return validateBackup(JSON.stringify(next))});
 case 'delete':return mutateState(s=>({...s,entries:s.entries.filter(e=>!(e.id===msg.id&&e.platform==='manual'))}));
 case 'ics':return exportIcs(await loadState());
 case 'backup':return JSON.stringify(await loadState(),null,2);
 case 'restore':{const data=validateBackup(msg.text);fence.invalidate();await configureSchoolLogin(data.settings.schoolAutoNext===true).catch(()=>{});const saved=await mutateState(()=>recoverInterrupted(data));await configureSyncSchedule(saved.settings);return saved}
 case 'clear':{fence.invalidate();await configureSchoolLogin(false);const saved=await mutateState(s=>emptyState(s.settings.locale));await configureSyncSchedule(saved.settings);return saved;}
 case 'clearSource':if(!platforms.includes(msg.platform))throw Error('platform');fence.invalidate(msg.platform);return mutateState(s=>clearSource(s,msg.platform));
 case 'testNotification':{const s=await loadState();await chrome.notifications.create({type:'basic',iconUrl:'icon.png',title:'WatDesk',message:s.settings.locale==='zh-CN'?'考试与任务提醒已准备就绪。':'Your exam and task reminders are ready.'});return {ok:true}}
 case 'open':if(msg.platform==='mobius'){const existing=await existingSourceTab('mobius');if(existing!=null){await chrome.tabs.update(existing,{active:true});return {ok:true}}const id=await sourceTab('learn',true);await waitForTab(id);return {ok:true}}if(platforms.includes(msg.platform)){const id=await sourceTab(msg.platform,true);await waitForTab(id);await autoLogin(msg.platform,id);return {ok:true}}throw Error('platform');
 default:throw Error('message');}}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{if(sender.id!==chrome.runtime.id||msg?.target==='offscreen')return false;if(sender.tab&&!sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){if(msg?.type==='crowdmark:page'&&sender.tab.url?.startsWith('https://app.crowdmark.com/')){void ready.then(async()=>{const state=await loadState();if(!openedRun&&state.sources.crowdmark?.status!=='ok'&&await chrome.permissions.contains({origins:[origins.crowdmark]}))void sync('crowdmark',false,false)});respond({ok:true});}return false;}handle(msg).then(value=>respond({ok:true,value})).catch(e=>respond({ok:false,error:e.message||String(e)}));return true});
chrome.runtime.onInstalled.addListener(()=>{chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});chrome.alarms.create('reminders',{periodInMinutes:1});void ready.then(s=>configureSyncSchedule(s.settings)).catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('reminders',{periodInMinutes:1});void ready.then(s=>configureSyncSchedule(s.settings)).catch(()=>{})});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='reminders')void notify().catch(()=>{});else if(alarm.name==='sync')void refreshOnOpen(false,false,true).catch(()=>{})});

// Returning from school sign-in retries failed sources without another Refresh click.
chrome.tabs?.onUpdated?.addListener((_id,change,tab)=>{if(change.status!=='complete'||!tab.url||openedRun)return;if(tab.url.startsWith('https://student.cs.uwaterloo.ca/~cs135/assign/viewsubmissions/')){void sync('cs135',false,false).catch(()=>{});return}if(tab.url.startsWith('https://uwmo.mobius.cloud/')){void sync('mobius',false,false).catch(()=>{});return}const p=platforms.find(p=>p!=='mobius'&&p!=='cs135'&&tab.url?.startsWith(urls[p]));if(!p)return;void ready.then(async()=>{const status=(await loadState()).sources[p];if(status?.status==='error'&&/sign.in|signed.out|session.unreadable/i.test(status.error||''))void sync(p,false,false).catch(()=>{})})});
