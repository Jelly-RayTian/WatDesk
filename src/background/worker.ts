import {emptyState,platforms,urls,origins,type AppState,type Platform,type Entry} from '../domain';
import {loadState,mutateState,applySnapshot,clearSource} from '../core/state';
import {planReminders,exportIcs,validateBackup,safeUrl} from '../core/util';
import {enrichCrowdmarkGrades} from '../adapters/crowdmark-api';
import {readPlatform} from '../adapters/read';
import {withTimeout,recoverInterrupted} from '../core/sync';
import {SyncFence} from '../core/fence';
import {sourceTab} from '../adapters/source-tabs';
import {configureSchoolLogin} from './school-login';
import {autoLogin} from '../adapters/login';
import {needsGradeRefresh} from '../core/presentation';
import {waitForTab} from '../core/sync';
import {enabledPlatforms} from '../core/onboarding';
import {pendingExamChanges} from '../core/organization';
import {canReuseSource} from '../core/refresh-policy';
const fence=new SyncFence();const syncJobs=new Map<string,Promise<void>>();
const ready=mutateState(recoverInterrupted);
void ready.then(s=>configureSchoolLogin(s.settings.schoolAutoNext===true)).catch(()=>{});
let openedRun:Promise<unknown>|undefined;
async function refreshOnOpen(forceGrades=false){
 await ready;if(openedRun)return openedRun;
 openedRun=(async()=>{
  const targets:Exclude<Platform,'manual'>[]=[];
  for(const p of enabledPlatforms(await loadState()))if(await chrome.permissions.contains({origins:[origins[p]]}))targets.push(p);
  await mutateState(s=>({...s,syncRun:{started:Date.now(),targets,completed:[],reused:[],finished:false}}));
  await Promise.allSettled(targets.map(async p=>{
   if(canReuseSource(p,(await loadState()).sources[p],forceGrades)){
    await mutateState(s=>({...s,syncRun:{...s.syncRun!,completed:[...new Set([...s.syncRun!.completed,p])],reused:[...s.syncRun!.reused||[],p]}}));return;
   }
   await sync(p,forceGrades);
   await mutateState(s=>({...s,syncRun:{...s.syncRun!,...(s.sources[p]?.status==='ok'?{completed:[...new Set([...s.syncRun!.completed,p])]}:{failed:s.syncRun!.failed||p})}}));
  }));
  await mutateState(s=>({...s,syncRun:{...s.syncRun!,finished:true}}));
 })();try{await openedRun}finally{openedRun=undefined}
}
function sync(p:Exclude<Platform,'manual'>,forceGrades=true){const running=syncJobs.get(p);if(running)return running;const job=runSync(p,forceGrades).finally(()=>syncJobs.delete(p));syncJobs.set(p,job);return job}
async function runSync(p:Exclude<Platform,'manual'>,forceGrades:boolean){
 await ready;if(p==='cs135'&&(await loadState()).settings.cs135Enabled!==true)return;const token=fence.capture(p);const started=Date.now();
 try{
  await mutateState(s=>({...s,sources:{...s.sources,[p]:{...s.sources[p],attempt:new Date().toISOString(),phase:'page',status:'syncing'}}}));
  const result=await withTimeout((async()=>{const tabId=await sourceTab(p,!(await loadState()).settings.onboardingComplete);await waitForTab(tabId);await autoLogin(p,tabId);await mutateState(s=>fence.current(p,token)?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:'tasks'}}}:s);try{return await readPlatform(p,await loadState(),forceGrades)}catch(e){if(p==='cs135'||!/signed.out|sign.in|session.unreadable|(?:^|\D)401(?:\D|$)/i.test(e instanceof Error?e.message:String(e)))throw e;await mutateState(s=>fence.current(p,token)?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:'page'}}}:s);await chrome.tabs.update(tabId,{url:urls[p]});await waitForTab(tabId);await autoLogin(p,tabId);return readPlatform(p,await loadState(),forceGrades)}})(),180000);
  await mutateState(s=>fence.current(p,token)?applySnapshot(s,p,result.entries,result.courses,{status:'ok',at:new Date().toISOString(),count:result.entries.length,identity:result.identity,error:result.warning||(p==='crowdmark'&&/^crowdmark-(?:grades|archive)/.test(s.sources[p]?.error||'')?s.sources[p]?.error:undefined),...(p==='learn'?{gradesAt:result.gradesAt,issues:result.issues,courseReadAt:result.courseReadAt}:{})}):s);
  if(p==='crowdmark'&&fence.current(p,token)&&needsGradeRefresh((await loadState()).sources[p]?.gradesAt,forceGrades)&&(forceGrades||Date.now()-Date.parse((await loadState()).sources[p]?.gradesAttemptAt||'1970-01-01')>=300000)){
   await mutateState(s=>fence.current(p,token)?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:'grades',gradesAttemptAt:new Date().toISOString()}}}:s);
   try{
    const grades=await enrichCrowdmarkGrades(await loadState(),{force:forceGrades,onCourse:async part=>{
     await mutateState(s=>{if(!fence.current(p,token))return s;const byUrl=new Map(part.entries.map(e=>[e.url,e]));const stamp=new Date().toISOString();const entries=s.entries.map(e=>{const fresh=e.platform===p?byUrl.get(e.url):undefined;if(!fresh)return e;byUrl.delete(e.url);return {...e,scorePercent:fresh.scorePercent,gradeStatus:fresh.gradeStatus,gradeText:fresh.gradeText,gradeVerifiedAt:stamp,gradeReadState:'fresh' as const}});entries.push(...[...byUrl.values()].map(e=>({...e,gradeVerifiedAt:stamp,gradeReadState:'fresh' as const})));return {...s,entries}});
    }});
    await mutateState(s=>{
     if(!fence.current(p,token)||s.sources[p]?.status!=='ok')return s;
     const byUrl=new Map(grades.entries.map(e=>[e.url,e]));
     const entries=s.entries.map(e=>{if(e.platform!==p)return e;const grade=byUrl.get(e.url);if(!grade)return e;byUrl.delete(e.url);return {...e,scorePercent:grade.scorePercent,gradeStatus:grade.gradeStatus,gradeText:grade.gradeText,gradeVerifiedAt:grade.readState==='retained'?e.gradeVerifiedAt:new Date().toISOString(),gradeReadState:grade.readState||'fresh',verifiedAt:grade.readState==='retained'?e.verifiedAt:new Date().toISOString(),readState:grade.readState||'fresh'}});
     entries.push(...[...byUrl.values()].map(e=>({...e,gradeVerifiedAt:e.readState==='retained'?e.gradeVerifiedAt:new Date().toISOString(),gradeReadState:e.readState||'fresh' as const})));return {...s,entries,courses:[...new Map([...s.courses,...grades.courses].map(c=>[c.id,c])).values()],sources:{...s.sources,[p]:{...s.sources[p],count:entries.filter(e=>e.platform===p&&!e.gone).length,gradesAt:grades.warning?undefined:new Date().toISOString(),gradesArchiveAt:grades.archiveAt,error:grades.warning}}};
    });
   }catch(e){await mutateState(s=>fence.current(p,token)&&s.sources[p]?.status==='ok'?{...s,sources:{...s.sources,[p]:{...s.sources[p],error:'crowdmark-grades-unavailable: '+(e instanceof Error?e.message:String(e))}}}:s)}
  }
 }catch(e){await mutateState(s=>fence.current(p,token)?({...s,sources:{...s.sources,[p]:{...s.sources[p],status:'error',error:e instanceof Error?e.message:String(e)}}}):s)}
 finally{await mutateState(s=>fence.current(p,token)?{...s,sources:{...s.sources,[p]:{...s.sources[p],phase:undefined,durationMs:Date.now()-started}}}:s);void notify().catch(()=>{})}
}
async function notifyExamChanges(){const state=await loadState();for(const {change,entry,key} of pendingExamChanges(state)){await chrome.notifications.create(key,{type:'basic',iconUrl:'icon.png',title:`${entry.course} ${entry.title}`,message:state.settings.locale==='zh-CN'?'考试时间、教室或座位有更新，请打开 WatDesk 核对。':'Exam time, room or seat changed. Open WatDesk to review.'});await mutateState(s=>({...s,sent:{...s.sent,[key]:change.at}}))}}
let notifying=false;
async function notify(){if(notifying)return;notifying=true;try{await notifyExamChanges();const s=await loadState();for(const r of planReminders(s,new Date().toISOString())){await chrome.notifications.create(r.key,{type:'basic',iconUrl:'icon.png',title:`${r.entry.course} ${r.entry.title}`,message:s.settings.locale==='zh-CN'?`${r.entry.category==='class'?'课程将在':r.entry.type==='exam'?'考试将在':'任务将在'} ${r.lead} 分钟${r.entry.type==='exam'?'后开始':'后截止'}。`:`${r.entry.category==='class'?'Class':r.entry.type==='exam'?'Exam':'Deadline'} within ${r.lead} minutes.`});await mutateState(state=>({...state,sent:{...state.sent,[r.key]:new Date().toISOString()}}))}}finally{notifying=false}}
async function handle(msg:any){await ready;switch(msg.type){
 case 'refreshOnOpen':void refreshOnOpen(msg.force===true).catch(()=>{});return {ok:true};
 case 'state':return loadState();
 case 'sync':if(platforms.includes(msg.platform)){void sync(msg.platform);return {ok:true}}throw Error('platform');
 case 'schoolLogin':{if(typeof msg.enabled!=='boolean')throw Error('invalid');await configureSchoolLogin(msg.enabled);return mutateState(s=>({...s,settings:{...s.settings,schoolAutoNext:msg.enabled}}))}
 case 'settings':if(msg.patch?.cs135Enabled===false)fence.invalidate('cs135');return mutateState(s=>{const settings={...s.settings,...msg.patch};const next=validateBackup(JSON.stringify({...s,settings}));if(msg.patch?.cs135Enabled===false&&next.sources.cs135)next.sources.cs135={...next.sources.cs135,phase:undefined,status:next.sources.cs135.at?'ok':'idle',error:undefined};return next});
 case 'overlay':return mutateState(s=>{const ids=Array.isArray(msg.ids)?msg.ids:[msg.id];const overlays={...s.overlays};for(const id of ids)if(s.entries.some(e=>e.id===id))overlays[id]={...overlays[id],...msg.patch};return {...s,overlays}});
 case 'manual':return mutateState(s=>{const entry=msg.entry as Entry;if(entry.platform!=='manual'||!entry.title.trim()||!safeUrl(entry.url)||!['exam','task'].includes(entry.type))throw Error('invalid');const next={...s,entries:[...s.entries.filter(e=>e.id!==entry.id),entry]};return validateBackup(JSON.stringify(next))});
 case 'delete':return mutateState(s=>({...s,entries:s.entries.filter(e=>!(e.id===msg.id&&e.platform==='manual'))}));
 case 'ics':return exportIcs(await loadState());
 case 'backup':return JSON.stringify(await loadState(),null,2);
 case 'restore':{const data=validateBackup(msg.text);fence.invalidate();await configureSchoolLogin(data.settings.schoolAutoNext===true).catch(()=>{});return mutateState(()=>recoverInterrupted(data))}
 case 'clear':fence.invalidate();await configureSchoolLogin(false);return mutateState(s=>emptyState(s.settings.locale));
 case 'clearSource':if(!platforms.includes(msg.platform))throw Error('platform');fence.invalidate(msg.platform);return mutateState(s=>clearSource(s,msg.platform));
 case 'testNotification':{const s=await loadState();await chrome.notifications.create({type:'basic',iconUrl:'icon.png',title:'WatDesk',message:s.settings.locale==='zh-CN'?'考试与任务提醒已准备就绪。':'Your exam and task reminders are ready.'});return {ok:true}}
 case 'open':if(platforms.includes(msg.platform)){const id=await sourceTab(msg.platform,true);await waitForTab(id);await autoLogin(msg.platform,id);return {ok:true}}throw Error('platform');
 default:throw Error('message');}}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{if(sender.id!==chrome.runtime.id)return false;if(sender.tab){if(msg?.type==='crowdmark:page'&&sender.tab.url?.startsWith('https://app.crowdmark.com/')){void ready.then(async()=>{const state=await loadState();if(!openedRun&&state.sources.crowdmark?.status!=='ok'&&await chrome.permissions.contains({origins:[origins.crowdmark]}))void sync('crowdmark')});respond({ok:true});}return false;}handle(msg).then(value=>respond({ok:true,value})).catch(e=>respond({ok:false,error:e.message||String(e)}));return true});
chrome.runtime.onInstalled.addListener(()=>{chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});chrome.alarms.create('reminders',{periodInMinutes:1});chrome.alarms.create('sync',{periodInMinutes:30});});
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create('reminders',{periodInMinutes:1});chrome.alarms.create('sync',{periodInMinutes:30})});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='reminders')void notify().catch(()=>{});else if(alarm.name==='sync')void (async()=>{await refreshOnOpen(false)})()});

// Returning from school sign-in retries failed sources without another Refresh click.
chrome.tabs?.onUpdated?.addListener((_id,change,tab)=>{if(change.status!=='complete'||!tab.url||openedRun)return;const p=platforms.find(p=>p!=='cs135'&&tab.url?.startsWith(urls[p]));if(!p)return;void ready.then(async()=>{const status=(await loadState()).sources[p];if(status?.status==='error'&&/sign.in|signed.out|session.unreadable/i.test(status.error||''))void refreshOnOpen().catch(()=>{})})});
