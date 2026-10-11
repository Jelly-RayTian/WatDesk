import {Temporal} from '@js-temporal/polyfill';
import type {AppState,Entry,ClassMeeting} from '../domain';
import {courseKey} from './organization';
import {campusInstant} from './util';

export function courseVisible(course:string,state:AppState,readerId?:string){
 if(state.settings.hiddenCourses?.some(c=>courseKey(c)===courseKey(course)))return false;
 const term=state.settings.activeTerm;
 if(!term||term==='all')return true;
 const record=readerId?state.courses.find(c=>c.id.endsWith(':'+readerId)):state.courses.find(c=>courseKey(c.code)===courseKey(course));
 // Unknown terms remain visible rather than silently losing real coursework.
 return !record?.term||record.term.toLowerCase()===term.toLowerCase();
}
export function campusTerm(now=new Date(),zone='America/Toronto'){
 const date=Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(zone);
 return `${date.month<=4?'Winter':date.month<=8?'Spring':'Fall'} ${date.year}`;
}
export function meetingEntries(state:AppState,now=Date.now(),days=14):Entry[]{
 const today=Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(state.settings.zone).toPlainDate();
 const entries:Entry[]=[];
 for(let offset=0;offset<days;offset++){
  const day=today.add({days:offset});
  for(const m of state.settings.classMeetings||[]){
   if(!m.enabled||day.dayOfWeek%7!==m.weekday||!courseVisible(m.course,state))continue;
   const start=campusInstant(`${day}T${m.start}`,state.settings.zone),end=campusInstant(`${day}T${m.end}`,state.settings.zone);
   if(!start||!end)continue;
   entries.push({id:`meeting:${m.id}:${day}`,platform:'manual',course:m.course,title:m.title||'Class',category:'class',type:'exam',start,end,due:null,status:'open',url:'',location:m.location});
  }
 }
 return entries.sort((a,b)=>a.start!.localeCompare(b.start!));
}
export function meetingForEntry(entry:Entry,state:AppState):ClassMeeting|undefined{
 return state.settings.classMeetings?.find(m=>entry.id.startsWith(`meeting:${m.id}:`));
}
export function entryFreshness(entry:Entry,state:AppState,now=Date.now()){
 if(entry.platform==='manual')return {kind:'personal' as const,at:undefined};
 const source=state.sources[entry.platform];
 const tool=entry.gradeOnly?'grades':entry.category==='quiz'?'quizzes':entry.category==='discussion'?'discussions':entry.type==='exam'?'calendar':'dropbox';
 const blocked=source?.issues?.some(i=>courseKey(i.course)===courseKey(entry.course)&&(i.tool===tool||entry.seenIn?.includes(i.tool)));
 const retained=entry.readState==='retained'||source?.status==='error'||blocked||entry.gradeOnly&&!!source?.error;
 const at=entry.verifiedAt||(entry.gradeOnly?source?.gradesAt:source?.at);
 return {kind:retained?'retained' as const:!at?'unknown' as const:now-Date.parse(at)<300000?'fresh' as const:'saved' as const,at};
}
export function gradeEntry(entry:Entry,state:AppState):Entry{return {...entry,gradeOnly:true,verifiedAt:entry.gradeOnly?entry.verifiedAt:entry.gradeVerifiedAt||state.sources[entry.platform]?.gradesAt,readState:entry.gradeOnly?entry.readState:entry.gradeReadState||entry.readState}}
export function gradeDisplay(entry:Entry,state:AppState){
 const zh=state.settings.locale==='zh-CN';
 const score=entry.scorePercent==null?undefined:`${Number(entry.scorePercent.toFixed(2))}%`;
 const raw=entry.gradeText?.trim();
 const unknown=entryFreshness(gradeEntry(entry,state),state).kind==='retained';
 return {primary:score||raw||(unknown?(zh?'未能读取':'Unavailable'):(zh?'未公布':'Not released')),raw:raw&&raw!==score?raw:undefined,unknown};
}
