import type {Entry} from '../domain';
export interface WorkloadDay {day:string;tasks:number;exams:number;load:number;level:0|1|2|3|4}
const EXAM_WEIGHT=3;
const addDays=(day:string,n:number)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export function buildWorkload(groups:{day:string;entries:Entry[]}[],today:string,days=14){
 const byDay=new Map(groups.map(g=>[g.day,g.entries]));
 const rows:WorkloadDay[]=Array.from({length:days},(_,i)=>{
  const day=addDays(today,i),entries=byDay.get(day)||[];
  const exams=entries.filter(e=>e.type==='exam').length,tasks=entries.length-exams,load=tasks+exams*EXAM_WEIGHT;
  return {day,tasks,exams,load,level:load===0?0:load<=2?1:load<=4?2:load<=6?3:4};
 });
 const peak=rows.reduce<WorkloadDay|null>((best,r)=>r.load>(best?.load??0)?r:best,null);
 const week=rows.slice(0,7).reduce((n,r)=>n+r.tasks+r.exams,0);
 const nextWeek=rows.slice(7,14).reduce((n,r)=>n+r.tasks+r.exams,0);
 return {rows,peak,week,nextWeek};
}
