import type {AppState} from '../domain';
import {buildWorkload} from '../core/workload';
import type {Entry} from '../domain';
interface Props {state:AppState;groups:{day:string;entries:Entry[]}[];today:string}
export function Workload({state,groups,today}:Props){
 const zh=state.settings.locale==='zh-CN',locale=state.settings.locale;
 const {rows,peak,week,nextWeek}=buildWorkload(groups,today);
 if(!rows.some(r=>r.load>0))return null;
 const label=(day:string)=>new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 const hint=(r:typeof rows[number])=>zh?`${label(r.day)}：${r.tasks} 项截止，${r.exams} 场考试`:`${label(r.day)}: ${r.tasks} due, ${r.exams} exam${r.exams===1?'':'s'}`;
 return <section className="workload" aria-label={zh?'未来两周工作量':'Workload, next two weeks'}>
  <header><div><p className="eyebrow">{zh?'工作量':'WORKLOAD'}</p><h2>{zh?'未来两周':'Next two weeks'}</h2></div><p className="small muted">{zh?`本周 ${week} 项 · 下周 ${nextWeek} 项`:`This week ${week} · next week ${nextWeek}`}</p></header>
  <div className="workload-bars" role="list">{rows.map(r=><div role="listitem" key={r.day} className={`workload-day level-${r.level}${r.day===today?' today':''}`} title={hint(r)} aria-label={hint(r)}><i/><span>{Number(r.day.slice(8))}</span></div>)}</div>
  {peak&&<p className="small muted workload-peak">{zh?`最忙的一天是 ${label(peak.day)}（${peak.tasks+peak.exams} 项），建议提前开始。`:`Busiest day: ${label(peak.day)} (${peak.tasks+peak.exams} items). Start early.`}</p>}
 </section>;
}
