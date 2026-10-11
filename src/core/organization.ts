import type {AppState,Entry,GradePlan} from '../domain';
export const courseKey=(s:string)=>s.toUpperCase().replace(/\s+/g,' ').trim();
export function duplicateKey(e:Entry):string|null{
 if(e.gone||e.gradeOnly||e.type!=='task'||e.platform==='manual'||!e.due||!e.course)return null;
 const title=e.title.trim().toLowerCase();
 const assignment=title.match(/^(?:assignment|a|homework|hw|problem set|ps|作业)\s*0*(\d+)\s*$/i);
 const normalized=assignment?'assignment:'+Number(assignment[1]):title.replace(/\s+/g,' ');
 return `${courseKey(e.course)}|${normalized}|${Date.parse(e.due)}`;
}
export function mergeTasks(entries:Entry[],s:AppState):Entry[]{
 const groups=new Map<string,Entry[]>();const singles:Entry[]=[];
 for(const e of entries){const key=s.overlays[e.id]?.keepSeparate?null:duplicateKey(e);if(!key){singles.push(e);continue}groups.set(key,[...groups.get(key)||[],e])}
 for(const group of groups.values()){
  // Multiple assessments from one source make a match ambiguous.
  if(group.length<2||new Set(group.map(e=>e.platform)).size!==group.length){singles.push(...group);continue}
  const rank=(e:Entry)=>(e.status==='submitted'?0:10)+({learn:0,crowdmark:1,cs135:2,odyssey:3,manual:4}[e.platform]);
  group.sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));
  singles.push({...group[0],mergedIds:group.map(e=>e.id),status:group.some(e=>e.status==='submitted')?'submitted':'open'});
 }
 return singles;
}
export function personallyDone(e:Entry,s:AppState){return (e.mergedIds||[e.id]).some(id=>s.overlays[id]?.done)}
export function personalNote(e:Entry,s:AppState){return [...new Set((e.mergedIds||[e.id]).map(id=>s.overlays[id]?.note||'').filter(Boolean))].join('\n')}
export function estimateGrade(entries:Entry[],plan:GradePlan){
 const weights=Object.values(plan.weights);const configured=weights.reduce((a,b)=>a+b,0);
 const valid=weights.every(w=>Number.isFinite(w)&&w>=0&&w<=100)&&configured<=100.000001;
 const graded=entries.filter(e=>typeof e.scorePercent==='number'&&Number.isFinite(e.scorePercent)&&plan.weights[e.id]>0);
 const completedWeight=graded.reduce((n,e)=>n+plan.weights[e.id],0);
 const earned=graded.reduce((n,e)=>n+e.scorePercent!*plan.weights[e.id]/100,0);
 const current=valid&&completedWeight>0?earned/completedWeight*100:null;
 const remaining=100-completedWeight;
 const required=valid&&plan.target!=null&&remaining>0?(plan.target-earned)/remaining*100:null;
 return {valid,configured,completedWeight,earned,current,remaining,required,unweighted:entries.filter(e=>e.scorePercent!=null&&!(plan.weights[e.id]>0)).length};
}
export function examCountdown(e:Entry,now:number,zh:boolean){
 if(!e.start)return zh?'时间未公布':'Time not published';
 const diff=Date.parse(e.start)-now;
 if(diff<=0)return e.end&&Date.parse(e.end)>now?(zh?'进行中':'In progress'):(zh?'已开始':'Started');
 const minutes=Math.max(1,Math.ceil(diff/60000)),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 return zh?`${days?days+' 天 ':''}${hours?hours+' 小时 ':''}${mins+' 分钟'}后`:`In ${days?days+'d ':''}${hours?hours+'h ':''}${mins}m`;
}
export function pendingExamChanges(s:AppState){
 if(!s.settings.notifications)return [];
 const latest=new Set<string>();return s.changes.flatMap(c=>{
  if(latest.has(c.id))return [];latest.add(c.id);
  const e=s.entries.find(e=>e.id===c.id&&!e.gone&&e.type==='exam');
  if(c.kind!=='exam'||!e||s.settings.hiddenCourses?.some(v=>courseKey(v)===courseKey(e.course))||s.settings.mutedCourses.includes(e.course)||(e.end||e.start)&&Date.parse((e.end||e.start)!)<Date.now())return [];
  const key=`exam-change:${c.id}:${c.after}`;return s.sent[key]?[]:[{change:c,entry:e,key}];
 });
}
