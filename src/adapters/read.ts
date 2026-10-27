import {platforms,urls,origins,type Platform,type AppState,type Course,type Entry,type LearnReadIssue} from '../domain';
import {enrichCs135Submissions,readCs135Submissions} from './cs135-submissions';
import {readOdyssey} from './odyssey';
import {withTemporaryTab} from './temporary-tab';
import {autoLogin} from './login';
import {readMobius} from './mobius';
import {readLearnSchedule} from './learn-schedule';
import {parseOdyssey,parseCs135Html} from './parsers';
import {readCrowdmarkApi} from './crowdmark-api';
import {withTimeout,retryFrame,waitForTab} from '../core/sync';
import {retainIncomplete} from './partial';
// MIT-licensed readers, attribution in THIRD_PARTY_NOTICES.md.
// @ts-ignore vendored JavaScript boundary
import {LiveSource} from '../vendor/watnow/data/live-source.js';
import {backgroundHtml,parseBackgroundHtml} from './background-html';
import type {Cs135Submissions} from './cs135-submissions';
import {cs135SubmissionsUrl} from './cs135-submissions';
import {existingSourceTab} from './source-tabs';
import {parseLearnCalendarQuizzes,mergeLearnQuizEntries,parseLearnGrades,parseLearnExams} from './learn-extras';
import {needsGradeRefresh} from '../core/presentation';
import {readLearnCourses} from './learn-batch';
import {courseVisible} from '../core/academic';
import {learnIssue,toolIssues,readLearnGradeBatch} from './learn-availability';
type ReaderPlatform=Exclude<Platform,'manual'>;
export async function relay(p:ReaderPlatform,path:string,tabId?:number){
 if(!((p==='learn'&&path.startsWith('/d2l/'))||(p==='crowdmark'&&path.startsWith('/api/v2/student/')))||path.startsWith('//'))throw Error('path');
 const id=tabId??await existingSourceTab(p);if(id==null)return {noTab:true};const tab=await chrome.tabs.get(id);if(tab.frozen||tab.discarded||tab.status!=='complete')return {noTab:true};const [result]=await withTimeout(retryFrame(()=>chrome.scripting.executeScript({target:{tabId:id},func:async(path:string)=>{try{const res=await fetch(path,{credentials:'include',signal:AbortSignal.timeout(20000)});const type=res.headers.get('content-type')||'';let json;let body='';let parseError;try{const text=await res.text();if(type.includes('json'))json=JSON.parse(text);else body=text.slice(0,16000)}catch(e){parseError=String(e)}return {status:res.status,type,json,body,parseError,redirected:res.redirected,loginRedirect:!res.url.startsWith(location.origin+'/d2l/')&&path.startsWith('/d2l/')}}catch(e){return {status:0,error:String(e)}}},args:[path]}),()=>waitForTab(id)),22000);return result?.result;
}
export async function readPlatform(...args:Parameters<typeof readPlatformOnce>):ReturnType<typeof readPlatformOnce>{
 try{return await readPlatformOnce(...args)}catch(e){
  if(args[0]!=='learn'||! /^(signed-out|no-tab|session-unreadable|sign-in-required)$/.test(e instanceof Error?e.message:String(e)))throw e;
 }
 return withTemporaryTab(urls.learn,async page=>{
  await autoLogin('learn',page.id,page.check);page.check();
  const result=await readPlatformOnce('learn',args[1],args[2],page.id,args[4]);page.check();return result;
 },{signal:args[4],timeout:60000});
}
async function readPlatformOnce(p:ReaderPlatform,state:AppState,forceGrades=false,existingTabId?:number,signal?:AbortSignal):Promise<{entries:Entry[];courses:Course[];identity?:string;warning?:string;gradesAt?:string;issues?:LearnReadIssue[];courseReadAt?:Record<string,string>}>{
 if(!platforms.includes(p))throw Error('platform');if(!(await chrome.permissions.contains({origins:[origins[p]]})))throw Error('permission');
 if(p==='mobius')return readMobius(state);
 if(p==='learn'){
  const tabId=existingTabId;
  const source=new LiveSource({school:'uwaterloo'},{relay:(_base:string,path:string)=>relay('learn',path,tabId)});
  const session=await source.checkSession();if(!session.signedIn)throw Error(session.reason||'signed-out');
  const listed=await source.listCourses();
  const courseReadAt={...state.sources.learn?.courseReadAt};const stamp=new Date().toISOString();
  const visible=listed.filter((c:any)=>courseVisible(c.code,state,c.id));
  const courses=visible.filter((c:any)=>forceGrades||!courseReadAt[c.id]||Date.now()-Date.parse(courseReadAt[c.id])>=600000);
  const cachedIds=new Set(listed.filter((c:any)=>!courses.includes(c)).map((c:any)=>String(c.id)));
  const entries:Entry[]=state.entries.filter(e=>e.platform==='learn'&&!e.gradeOnly&&!e.gone&&cachedIds.has(e.readerCourseId||'')).map(e=>({...e,readState:'retained' as const}));let failed=0;
  const results=await readLearnCourses<any,any[]>(source,courses);
  for(const [index,result] of results.entries()){if(result.status==='rejected'){if(result.reason?.code==='signed-out'||result.reason?.status===401)throw Error('signed-out');failed++;continue}courseReadAt[courses[index].id]=stamp;for(const i of result.value)entries.push(fromReader(i,courses[index].code,'learn'))}
  if(failed)throw Error(`partial:${failed}`);
  entries.splice(0,entries.length,...mergeLearnQuizEntries(entries,parseLearnCalendarQuizzes(source.calendar?.events||[],visible)));
  const scheduleIssues:LearnReadIssue[]=[];
  for(const course of courses){try{const supplemental=await readLearnSchedule(source,course,tabId);entries.splice(0,entries.length,...mergeLearnQuizEntries(entries,supplemental))}catch(e){scheduleIssues.push(learnIssue(course.code,'schedule',e));entries.push(...state.entries.filter(e=>e.platform==='learn'&&e.readerCourseId===String(course.id)&&e.seenIn?.includes('course-schedule')&&!e.gone).map(e=>({...e,readState:'retained' as const})))}}
  const exams=parseLearnExams(source.calendar?.events||[],visible);const examIds=new Set(exams.map(e=>e.id.split(':').at(-1)));
  const deadlines=entries.filter(e=>!examIds.has(e.id.match(/:content:cal(\d+)$/)?.[1]||''));deadlines.push(...exams);
  const previousGrades=state.entries.filter(e=>e.platform==='learn'&&e.gradeOnly&&!e.gone);let gradesAt=state.sources.learn?.gradesAt;
  const cachedCodes=new Set(listed.filter((c:any)=>cachedIds.has(String(c.id))).map((c:any)=>c.code));
  const issues=[...scheduleIssues,...toolIssues(source.report.courses),...(state.sources.learn?.issues||[]).filter(i=>i.tool!=='grades'&&cachedCodes.has(i.course))];
  if(needsGradeRefresh(gradesAt,forceGrades)){
   const grades=await readLearnGradeBatch(source,visible,previousGrades);deadlines.push(...grades.entries,...previousGrades.filter(e=>!visible.some((c:any)=>c.id===e.readerCourseId)).map(e=>({...e,readState:'retained' as const})));issues.push(...grades.issues);
   gradesAt=grades.retry?undefined:new Date().toISOString();
  }else{deadlines.push(...previousGrades.map(e=>({...e,readState:'retained' as const})));issues.push(...state.sources.learn?.issues?.filter(i=>i.tool==='grades')||[])}
  const failures=issues.filter(i=>i.kind==='failed');
  return {entries:retainIncomplete(state.entries.filter(e=>!e.gradeOnly&&!e.gone),[...new Map(deadlines.map(e=>[e.id,e])).values()],source.readOk),gradesAt,issues,courseReadAt,courses:listed.map((c:any)=>({id:`learn:${c.id}`,code:c.code,name:c.name||c.code,term:(c.name||'').match(/(?:Fall|Winter|Spring)\s+\d{4}/i)?.[0]})),identity:session.student?.name,warning:failures.length?`learn-partial: ${failures.map(i=>`${i.course}/${i.tool}/${i.status||i.code}`).join('; ')}`:undefined};
 }
 if(p==='crowdmark')return readCrowdmarkApi(state);
 if(p==='cs135'){const r=await fetch(urls.cs135+'calendar/index.html',{signal:AbortSignal.timeout(20000),cache:'no-store'});if(!r.ok)throw Error('cs135-http:'+r.status);const calendar=parseCs135Html(await r.text());let submissions:Cs135Submissions|null=null;try{submissions=await parseBackgroundHtml<Cs135Submissions|null>('cs135',await backgroundHtml(cs135SubmissionsUrl))}catch{/* Login required; keep previous confirmations. */}submissions??=await readCs135Submissions();return {entries:enrichCs135Submissions(calendar,state.entries,submissions,new Date().toISOString()),identity:submissions?.identity,warning:!submissions?'cs135-submissions-unavailable':!submissions.complete?'cs135-submissions-partial':undefined,courses:[{id:'cs135:web',code:'CS 135',name:'Designing Functional Programs'}]}}
 if(p==='odyssey')return readOdyssey(signal);
 throw Error('platform');
}
function fromReader(i:any,course:string,platform:'learn'|'crowdmark'):Entry{return {id:`${platform}:${i.id}`,platform,course,category:i.category,title:i.title,type:'task',start:i.opensAt||null,end:null,due:i.dueAt||null,status:i.status==='submitted'?'submitted':'open',url:i.url||urls[platform],seenIn:i.seenIn,readerCourseId:i.courseId}}
