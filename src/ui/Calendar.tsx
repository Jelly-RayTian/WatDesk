import {useState} from 'react';
import {ArrowLeft,ArrowRight,Plus,GraduationCap} from '@phosphor-icons/react';
import type {Entry,Locale,AppState} from '../domain';
import type {TranslationKey} from '../i18n';
import {fmtEntry,stamp} from '../core/util';
import {Freshness} from './DataTools';
import {meetingEntries} from '../core/academic';
import {entryKind,kindLabel} from '../core/presentation';

const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function Calendar({entries,zone,locale,t,onEntry,colors,onAdd,state}:{state:AppState;onAdd:(day:string)=>void;colors:Record<string,string>;entries:Entry[];zone:string;locale:Locale;t:(k:TranslationKey)=>string;onEntry:(e:Entry)=>void}){
 const zh=locale==='zh-CN';
 const dateKey=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
 const today=dateKey(new Date().toISOString());
 const fromKey=(value:string)=>{const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12)};
 const [selected,setSelected]=useState(today),[cursor,setCursor]=useState(()=>fromKey(today));
 const [mode,setMode]=useState<'month'|'week'|'agenda'>('month');
 const [course,setCourse]=useState('all'),[examsOnly,setExamsOnly]=useState(false);
 const year=cursor.getFullYear(),month=cursor.getMonth(),first=new Date(year,month,1,12);
 const start=mode==='agenda'?fromKey(today):mode==='month'?new Date(year,month,1-(first.getDay()+6)%7,12):new Date(year,month,cursor.getDate()-(cursor.getDay()+6)%7,12);
 const days=Array.from({length:mode==='month'?42:7},(_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));
 const events=new Map<string,Entry[]>();
 for(const e of [...entries.filter(e=>e.category!=='class'),...meetingEntries(state,start.getTime(),days.length)]){if(course!=='all'&&e.course!==course||examsOnly&&(e.type!=='exam'||e.category==='class'))continue;const time=stamp(e);if(!time)continue;const day=e.dateOnly||dateKey(time);events.set(day,[...(events.get(day)||[]),e])}
 for(const items of events.values())items.sort((a,b)=>stamp(a)!.localeCompare(stamp(b)!));
 // Keep the grid stable between the two clicks, including adjacent-month cells.
 const choose=(d:Date)=>setSelected(key(d));
 const move=(direction:number)=>{const d=mode==='month'?new Date(year,month+direction,1,12):new Date(year,month,cursor.getDate()+direction*7,12);setCursor(d);setSelected(key(d))};
 const selectedEvents=events.get(selected)||[];
 return <section className="month-calendar">
  <div className="calendar-toolbar"><h2>{new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(mode==='agenda'?fromKey(today):cursor)}</h2><div className="toolbar"><button className="text-button" onClick={()=>{setCursor(fromKey(today));setSelected(today)}}>{zh?'今天':'Today'}</button>{mode!=='agenda'&&<><button className="icon-button" aria-label={t('previous')} onClick={()=>move(-1)}><ArrowLeft size={18}/></button><button className="icon-button" aria-label={t('next')} onClick={()=>move(1)}><ArrowRight size={18}/></button></>}</div></div>
  <div className="calendar-view-switch tabs">{(['month','week','agenda'] as const).map(v=><button key={v} aria-pressed={mode===v} className={mode===v?'active':''} onClick={()=>{setMode(v);setCursor(fromKey(selected))}}>{v==='agenda'?(zh?'未来七天':'Next 7 days'):t(v==='week'?'weekView':'month')}</button>)}</div>
  <div className="calendar-filters"><select aria-label={zh?'日历课程筛选':'Calendar course filter'} value={course} onChange={e=>setCourse(e.target.value)}><option value="all">{zh?'全部课程':'All courses'}</option>{[...new Set(entries.map(e=>e.course).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select><label className="check-label"><input type="checkbox" checked={examsOnly} onChange={e=>setExamsOnly(e.target.checked)}/>{zh?'只看考试':'Exams only'}</label></div><p className="calendar-legend"><GraduationCap size={13}/>{zh?'方形标记为考试；圆点代表其他安排':'Square markers indicate exams; dots indicate other events'}</p><p className="small muted">{zh?'双击日期或空白处添加事项':'Double-click a date or empty space to add an item'}</p>
  {mode!=='agenda'&&<><div className="calendar-weekdays" aria-hidden="true">{days.slice(0,7).map(d=><span key={key(d)}>{new Intl.DateTimeFormat(locale,{weekday:'short'}).format(d)}</span>)}</div>
  <div className={`calendar-grid ${mode}`} aria-label={zh?'日期日历':'Date calendar'}>{days.map(d=>{const day=key(d),items=events.get(day)||[];return <div className={`calendar-day ${d.getMonth()!==month?'outside':''} ${day===selected?'selected':''} ${day===today?'is-today':''}`} key={day} onDoubleClick={event=>{if((event.target as Element).closest('.calendar-event, .calendar-cell-events button'))return;choose(d);onAdd(day)}}>
   <button className="calendar-date" aria-current={day===today?'date':undefined} aria-pressed={day===selected} aria-label={`${new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(d)} · ${items.length} ${zh?'项安排':'events'}`} onClick={()=>choose(d)}><strong>{d.getDate()}</strong><span className="calendar-dots" aria-hidden="true">{items.slice(0,3).map(e=><i key={e.id} className={e.type==='exam'&&e.category!=='class'?'exam-dot':''} style={{background:colors[e.course]||'var(--accent)'}}/>)}{items.length>3&&<small>+</small>}</span></button>
   <div className="calendar-cell-events">{items.slice(0,3).map(e=><button key={e.id} className={`calendar-event ${e.type}`} style={{background:colors[e.course],color:'#28314b'}} onClick={()=>onEntry(e)}><b>{e.course}</b><span>{e.title}</span></button>)}{items.length>3&&<button className="text-button" onClick={()=>choose(d)}>+{items.length-3}</button>}</div>
  </div>})}</div></>}
  {mode==='agenda'?<section className="calendar-agenda">{days.map(d=>{const items=events.get(key(d))||[];return <section className="agenda-day-group" key={key(d)}><div className="section-title"><h2>{new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',weekday:'short'}).format(d)}</h2><button className="icon-button" aria-label={`${zh?'添加个人事项':'Add personal item'} ${key(d)}`} onClick={()=>onAdd(key(d))}><Plus size={16}/></button></div>{items.length?items.map(e=><button key={e.id} className="agenda-row" style={{borderLeft:`3px solid ${colors[e.course]}`}} onClick={()=>onEntry(e)}><span>{fmtEntry(e,locale,zone)} · {kindLabel(entryKind(e),locale)}</span><strong>{e.course} · {e.title}</strong><Freshness entry={e} state={state}/></button>):<p className="muted small">{zh?'没有安排':'No events'}</p>}</section>})}</section>:<section className="calendar-agenda" aria-live="polite"><div className="section-title"><h2>{new Intl.DateTimeFormat(locale,{month:'long',day:'numeric',weekday:'short'}).format(fromKey(selected))}</h2><button className="text-button" onClick={()=>onAdd(selected)}><Plus size={15}/>{zh?'添加事项':'Add item'}</button><span className="small muted">{selectedEvents.length} {zh?'项安排':'events'}</span></div>{selectedEvents.length?selectedEvents.map(e=><button key={e.id} className="agenda-row" style={{borderLeft:`3px solid ${colors[e.course]}`}} onClick={()=>onEntry(e)}><span>{fmtEntry(e,locale,zone)} · {kindLabel(entryKind(e),locale)}</span><strong>{e.course} · {e.title}</strong><Freshness entry={e} state={state}/></button>):<p className="calendar-empty">{zh?'当天没有已读取的任务或考试。':'No synced tasks or exams on this day.'}</p>}</section>}
 </section>;
}
