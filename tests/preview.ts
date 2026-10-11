// Development only. Not included in either production build entry point.
import {enabledPlatforms} from '../src/core/onboarding';
import {parseLearnGrades,parseLearnExams} from '../src/adapters/learn-extras';
import {emptyState} from '../src/domain';
import {applySnapshot} from '../src/core/state';
import {parseCs135} from '../src/adapters/parsers';
let s=emptyState('zh-CN');s.entries=parseCs135([{month:'October 2026',cells:['20 A04 Due','27 A05 Due']},{month:'November 2026',cells:['9 Midterm 19:00–20:50']}],true);
s.entries.push({id:'preview:math',platform:'odyssey',course:'MATH 135',title:'Midterm',type:'exam',start:'2026-10-21T23:00:00Z',end:'2026-10-22T00:50:00Z',due:null,status:'open',url:'https://odyssey.uwaterloo.ca/teaching/schedule',location:'Not published',seat:''});
for(const p of ['learn','crowdmark','odyssey','cs135'] as const)s.sources[p]={status:'ok',durationMs:2300,at:new Date().toISOString()};
if(new URLSearchParams(location.search).has('grades')){s.settings.onboardingComplete=true;s.settings.theme='light';s.entries=[...Array.from({length:8},(_,i)=>({id:'preview-grade:'+i,platform:'crowdmark' as const,course:i<4?'MATH 135':'MATH 137',title:'Practice '+(i%4+1),type:'task' as const,start:null,end:null,due:`2026-09-${String(11+(i%4)*6).padStart(2,'0')}T20:05:00Z`,status:'submitted' as const,url:'https://app.crowdmark.com/student/courses',scorePercent:[88,92,96,90,82,91,85,undefined][i],gradeStatus:'graded' as const}))]}
if(new URLSearchParams(location.search).has('setup')){s.sources={};s.entries=[];s.settings.theme='light'}
if(new URLSearchParams(location.search).has('workspace')){s.settings.onboardingComplete=true;for(let i=0;i<7;i++){const due=new Date();due.setDate(due.getDate()+i-1);due.setHours(21,0,0,0);s.entries.push({id:'preview-task:'+i,platform:i%2?'crowdmark':'learn',course:i%2?'MATH 137':'MATH 135',title:['Assignment 03','Problem Set 04','Quiz 2 — Linear equations','Assignment 04','Weekly practice','Problem Set 05','Reading reflection'][i],type:'task',due:due.toISOString(),start:null,end:null,status:'open',url:'https://learn.uwaterloo.ca/'})}}
if(new URLSearchParams(location.search).has('overflow')){s.settings.onboardingComplete=true;for(const [i,course] of ['ECON 101','ENGL 119','MATH 137','MATH 135','CS 135','STAT 230','ZZ very long course name without a short code'].entries()){s.entries.push({id:'overflow:'+i,platform:'learn',course,title:i===0?'A deliberately long assignment title with multiple parts and important submission instructions':'Assignment '+(i+1),type:'task',due:new Date(Date.now()+86400000*(i+1)).toISOString(),start:null,end:null,status:'open',url:''})}}
if(new URLSearchParams(location.search).has('readfail')){s.settings.onboardingComplete=true;for(const p of ['learn','crowdmark','odyssey'])s.sources[p]={status:'error',error:p==='learn'?'unreachable':p==='crowdmark'?'signed-out: Crowdmark returned 401':'Frame with ID 0 was removed.',at:'2026-10-10T17:41:00Z'}}
if(new URLSearchParams(location.search).has('types')){
 s.settings.onboardingComplete=true;s.entries=s.entries.filter(e=>e.type==='exam');
 for(const [i,[course,title,category]] of [['CS 135','Assignment 04','assignment'],['ECON 101','Midterm 1','quiz'],['MATH 135','Lab 03 — Linear equations','lab'],['ENGL 119','Reading reflection','reading'],['MATH 137','Week 6 discussion','discussion']].entries()){
 s.entries.push({id:'types:'+i,platform:'learn',course,title,category:category as any,type:'task',due:new Date(Date.now()+86400000*(i+1)).toISOString(),start:i===1?new Date(Date.now()+43200000).toISOString():null,end:null,status:'open',url:'https://learn.uwaterloo.ca/d2l/home'});
 }
}
if(new URLSearchParams(location.search).has('learnextras')){s.settings.onboardingComplete=true;s.entries.push(...parseLearnGrades([{GradeObjectIdentifier:1,GradeObjectName:'Assignment 03',DisplayedGrade:'85 / 100',PointsNumerator:85,PointsDenominator:100},{GradeObjectIdentifier:2,GradeObjectName:'Integrity module',DisplayedGrade:'Pass'}],'MATH 135','12345'),...parseLearnExams([{Title:'Midterm exam',OrgUnitId:12345,CalendarEventId:7,StartDateTime:new Date(Date.now()+86400000*7).toISOString(),EndDateTime:new Date(Date.now()+86400000*7+7200000).toISOString()}],[{id:'12345',code:'MATH 135',orgUnitId:12345}]))}
if(new URLSearchParams(location.search).has('tools')){
 s.settings.onboardingComplete=true;s.settings.cs135Enabled=true;
 const due=new Date(Date.now()+86400000*2).toISOString();
 s.entries.push({id:'demo:learn',platform:'learn',course:'CS 135',title:'Assignment 04',type:'task',due,start:null,end:null,status:'open',url:'https://learn.uwaterloo.ca/d2l/home'},{id:'demo:cm',platform:'crowdmark',course:'CS 135',title:'A04',type:'task',due,start:null,end:null,status:'submitted',url:'https://app.crowdmark.com/student/courses'});
 for(let i=0;i<4;i++)s.entries.push({id:'demo:grade:'+i,platform:'crowdmark',readerCourseId:'math135',course:'MATH 135',title:['Assignment 01','Assignment 02','Midterm','Final exam'][i],type:'task',due:new Date(Date.now()-86400000*(28-i*7)).toISOString(),start:null,end:null,status:i<3?'submitted':'open',scorePercent:[80,88,92,undefined][i],url:'https://app.crowdmark.com/student/courses'});
 s.settings.gradePlans={'crowdmark:math135':{weights:{'demo:grade:0':10,'demo:grade:1':10,'demo:grade:2':30,'demo:grade:3':50},target:85}};
 const exam={id:'demo:exam',platform:'odyssey' as const,course:'MATH 137',title:'Midterm exam',type:'exam' as const,start:new Date(Date.now()+86400000*3).toISOString(),end:new Date(Date.now()+86400000*3+7200000).toISOString(),due:null,status:'open' as const,url:'https://odyssey.uwaterloo.ca/teaching/schedule',location:'DC 1350',seat:'B12'};s.entries.push(exam,{...exam,id:'demo:conflict',course:'MATH 135',title:'Course exam',start:new Date(Date.parse(exam.start)+3600000).toISOString()});
 s.changes.unshift({kind:'exam',id:exam.id,title:exam.title,at:new Date().toISOString(),before:[null,exam.start,exam.end,'MC 2066','A03'].join('|'),after:[null,exam.start,exam.end,exam.location,exam.seat].join('|')});
}
if(new URLSearchParams(location.search).has('availability')){s.settings.onboardingComplete=true;s.sources.learn.issues=[{course:'MATH 135',tool:'grades',kind:'unavailable',code:'forbidden',status:403},{course:'MATH 137',tool:'quizzes',kind:'unavailable',code:'not-found',status:404}]}
const listeners=new Set<any>();function publish(){listeners.forEach(fn=>fn({watdesk:{newValue:structuredClone(s)}}))}
(window as any).chrome={storage:{onChanged:{addListener:(f:any)=>listeners.add(f),removeListener:(f:any)=>listeners.delete(f)}},runtime:{getURL:()=>'/preview.html',sendMessage:async(m:any)=>{switch(m.type){case 'state':return {ok:true,value:structuredClone(s)};case 'refreshOnOpen':{
 const demo=new URLSearchParams(location.search);const targets=enabledPlatforms(s);
 void (async()=>{
 s.syncRun={started:Date.now(),targets:[...targets],completed:[],finished:false};publish();
 for(const p of targets){
  s.syncRun.active=p;s.sources[p]={...s.sources[p],status:'syncing',phase:p==='crowdmark'?'grades':'tasks',attempt:new Date().toISOString()};publish();
  if(demo.has('syncdemo'))await new Promise(r=>setTimeout(r,3500));
  if(p==='crowdmark'&&(demo.has('syncerror')||demo.has('readfail'))){s.sources[p]={...s.sources[p],phase:undefined,durationMs:3500,status:'error',error:'signed-out: Please sign in on Crowdmark.'};s.syncRun={...s.syncRun,active:undefined,failed:p,finished:true};publish();return {ok:true,value:true}}
  s.sources[p]={...s.sources[p],phase:undefined,durationMs:3500,status:'ok',at:new Date().toISOString()};s.syncRun.completed.push(p);s.syncRun.active=undefined;publish();
 }
 s.syncRun!.finished=true;publish();})();return {ok:true,value:true}
};case 'open':return {ok:true,value:true};case 'sync':s.sources[m.platform]={...s.sources[m.platform],status:'ok',phase:undefined,error:undefined,durationMs:1800,at:new Date().toISOString()};break;case 'settings':s.settings={...s.settings,...m.patch};break;case 'overlay':for(const id of m.ids||[m.id])s.overlays[id]={...s.overlays[id],...m.patch};break;case 'manual':s.entries=[...s.entries.filter(e=>e.id!==m.entry.id),m.entry];break;case 'delete':s.entries=s.entries.filter(e=>e.id!==m.id);break;default:return {ok:false,error:'Development preview: live connections are available in the extension.'}}publish();return {ok:true,value:true}}},tabs:{create:()=>{}},permissions:{request:async()=>true,contains:async()=>true}};
void import('../src/ui/main');
