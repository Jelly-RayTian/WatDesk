import type {AppState,Entry} from '../domain';
import {stamp} from './util';
import {personallyDone} from './organization';
export const campusDay=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export function buildOverview(entries:Entry[],state:AppState,now:number){
 const today=campusDay(new Date(now).toISOString(),state.settings.zone);
 const complete=(e:Entry)=>e.status==='submitted'||personallyDone(e,state);
 const valid=(v:string|null)=>!!v&&Number.isFinite(Date.parse(v));
 const eligible=entries.filter(e=>!e.gone&&!complete(e));
 const future=eligible.filter(e=>e.dateOnly?e.dateOnly>=today:valid(stamp(e))&&Date.parse(e.type==='exam'?e.end||e.start!:e.due!)>=now).sort((a,b)=>Date.parse(stamp(a)!)-Date.parse(stamp(b)!));
 const overdue=eligible.filter(e=>e.type==='task'&&(e.dateOnly?e.dateOnly<today:valid(e.due)&&Date.parse(e.due!)<now));
 const undated=eligible.filter(e=>!valid(stamp(e)));
 const dayOf=(e:Entry)=>e.dateOnly||(e.type==='exam'&&e.start&&Date.parse(e.start)<now&&e.end&&Date.parse(e.end)>now?today:campusDay(stamp(e)!,state.settings.zone));
 const todayTasks=future.filter(e=>e.type==='task'&&dayOf(e)===today);
 const todayExams=future.filter(e=>e.type==='exam'&&dayOf(e)===today);
 const map=new Map<string,Entry[]>();for(const e of future){const key=dayOf(e);map.set(key,[...map.get(key)||[],e])}
 const groups=[...map].sort(([a],[b])=>a.localeCompare(b)).map(([day,items])=>({day,entries:items}));
 const courseCounts:Record<string,number>={};for(const e of future)courseCounts[e.course]=(courseCounts[e.course]||0)+1;
 return {today,todayTasks,todayExams,future,overdue,undated,groups,courseCounts};
}
