import type {Entry} from '../domain';
export function parseLearnGrades(rows:any[],course:string,courseId:string):Entry[]{
 return rows.filter(r=>r&&r.GradeObjectIdentifier!=null&&r.GradeObjectName).map(r=>{
  const numerator=r.PointsNumerator,denominator=r.PointsDenominator;
  const displayed=typeof r.DisplayedGrade==='string'?r.DisplayedGrade.trim():'';
  const explicit=displayed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  // Hidden grades must remain unknown, even if a payload contains raw points.
  const released=!!displayed&&!/^(?:-|—|not released|ungraded|n\/a)$/i.test(displayed);
  const score=released&&typeof numerator==='number'&&Number.isFinite(numerator)&&typeof denominator==='number'&&Number.isFinite(denominator)&&denominator>0?numerator/denominator*100:released&&explicit?Number(explicit[1]):undefined;
  return {id:`learn:grade:${courseId}:${r.GradeObjectIdentifier}`,platform:'learn',course,title:String(r.GradeObjectName),type:'task',gradeOnly:true,gradeKind:[7,8].includes(r.GradeObjectType)?'overall':[5,6,9].includes(r.GradeObjectType)?'average':undefined,gradeRecordedAt:typeof r.ReleasedDate==='string'&&Number.isFinite(Date.parse(r.ReleasedDate))?new Date(r.ReleasedDate).toISOString():undefined,start:null,end:null,due:null,status:'open',readerCourseId:courseId,scorePercent:score,gradeText:released&&typeof numerator==='number'&&typeof denominator==='number'&&denominator>0?`${numerator} / ${denominator}`:released?displayed:undefined,gradeStatus:released?'graded':'pending',url:`https://learn.uwaterloo.ca/d2l/lms/grades/my_grades/main.d2l?ou=${encodeURIComponent(courseId)}`};
 });
}
export function parseLearnExams(events:any[],courses:Array<{id:string;code:string;orgUnitId:number}>):Entry[]{
 const iso=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
 return events.filter(e=>e&&/\b(midterm|final\s+exam|examination|exam)\b|期中考试|期末考试/i.test(e.Title||'')&&!/\b(review|practice|preparation|prep|study|revision)\b/i.test(e.Title||'')&&!e.IsAllDayEvent&&!e.IsRecurring&&!e.AssociatedEntity?.AssociatedEntityId).flatMap(e=>{
  const c=courses.find(c=>String(c.orgUnitId)===String(e.OrgUnitId)),start=iso(e.StartDateTime);if(!c||!start||e.CalendarEventId==null)return [];
  const end=iso(e.EndDateTime);return [{id:`learn:exam:${e.CalendarEventId}`,platform:'learn' as const,course:c.code,title:String(e.Title),type:'exam' as const,category:'exam' as const,start,end:end&&end>start?end:null,due:null,status:'open' as const,readerCourseId:c.id,seenIn:['calendar'],url:`https://learn.uwaterloo.ca/d2l/le/calendar/${encodeURIComponent(c.id)}`}];
 });
}

// Teacher-created Module Quiz calendar events use EventType=1 even though their
// explicit title/time is a real deadline. Keep this narrow; office hours stay out.
export function parseLearnCalendarQuizzes(events:any[],courses:Array<{id:string;code:string;orgUnitId:number}>):Entry[]{
 return events.flatMap(e=>{
  if(!e||!/^Module\s+\d+\s+Quiz$/i.test(String(e.Title||'').trim())||e.IsRecurring||e.IsAllDayEvent||e.IsAssociatedWithEntity!==false&&e.AssociatedEntity)return [];
  const c=courses.find(c=>String(c.orgUnitId)===String(e.OrgUnitId));const raw=e.EndDateTime||e.StartDateTime;
  if(!c||e.CalendarEventId==null||typeof raw!=='string'||!Number.isFinite(Date.parse(raw)))return [];
  const due=new Date(raw).toISOString();const earlier=typeof e.StartDateTime==='string'&&Number.isFinite(Date.parse(e.StartDateTime))&&Date.parse(e.StartDateTime)<Date.parse(due)?new Date(e.StartDateTime).toISOString():null;
  return [{id:`learn:calendar-quiz:${e.CalendarEventId}`,platform:'learn' as const,course:c.code,title:String(e.Title).trim(),category:'quiz' as const,type:'task' as const,start:earlier,due,end:null,status:'open' as const,readerCourseId:c.id,seenIn:['calendar'],url:`https://learn.uwaterloo.ca/d2l/le/calendar/${c.orgUnitId}`}];
 });
}
export function mergeLearnQuizEntries(entries:Entry[],extra:Entry[]):Entry[]{
 const merged=[...entries];
 for(const entry of extra){const index=merged.findIndex(e=>e.course===entry.course&&e.title.trim().toLowerCase()===entry.title.trim().toLowerCase()&&e.due&&entry.due&&Date.parse(e.due)===Date.parse(entry.due));
  if(index<0){merged.push(entry);continue}
  const old=merged[index];merged[index]={...old,start:old.start||entry.start,url:entry.seenIn?.includes('course-schedule')?entry.url:old.url,seenIn:[...new Set([...old.seenIn||[],...entry.seenIn||[]])]};
 }
 return merged;
}
