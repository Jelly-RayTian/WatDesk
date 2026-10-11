import type {Entry} from '../domain';
export function parseLearnGrades(rows:any[],course:string,courseId:string):Entry[]{
 return rows.filter(r=>r&&r.GradeObjectIdentifier!=null&&r.GradeObjectName).map(r=>{
  const numerator=r.PointsNumerator,denominator=r.PointsDenominator;
  const displayed=typeof r.DisplayedGrade==='string'?r.DisplayedGrade.trim():'';
  const explicit=displayed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  // Hidden grades must remain unknown, even if a payload contains raw points.
  const released=!!displayed&&!/^(?:-|—|not released|ungraded|n\/a)$/i.test(displayed);
  const score=released&&typeof numerator==='number'&&Number.isFinite(numerator)&&typeof denominator==='number'&&Number.isFinite(denominator)&&denominator>0?numerator/denominator*100:released&&explicit?Number(explicit[1]):undefined;
  return {id:`learn:grade:${courseId}:${r.GradeObjectIdentifier}`,platform:'learn',course,title:String(r.GradeObjectName),type:'task',gradeOnly:true,gradeRecordedAt:typeof r.ReleasedDate==='string'&&Number.isFinite(Date.parse(r.ReleasedDate))?new Date(r.ReleasedDate).toISOString():undefined,start:null,end:null,due:null,status:'open',readerCourseId:courseId,scorePercent:score,gradeText:released?displayed:undefined,gradeStatus:released?'graded':'pending',url:`https://learn.uwaterloo.ca/d2l/lms/grades/my_grades/main.d2l?ou=${encodeURIComponent(courseId)}`};
 });
}
export function parseLearnExams(events:any[],courses:Array<{id:string;code:string;orgUnitId:number}>):Entry[]{
 const iso=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
 return events.filter(e=>e&&/\b(midterm|final\s+exam|examination|exam)\b|期中考试|期末考试/i.test(e.Title||'')&&!/\b(review|practice|preparation|prep|study|revision)\b/i.test(e.Title||'')&&!e.IsAllDayEvent&&!e.IsRecurring&&!e.AssociatedEntity?.AssociatedEntityId).flatMap(e=>{
  const c=courses.find(c=>String(c.orgUnitId)===String(e.OrgUnitId)),start=iso(e.StartDateTime);if(!c||!start||e.CalendarEventId==null)return [];
  const end=iso(e.EndDateTime);return [{id:`learn:exam:${e.CalendarEventId}`,platform:'learn' as const,course:c.code,title:String(e.Title),type:'exam' as const,category:'exam' as const,start,end:end&&end>start?end:null,due:null,status:'open' as const,readerCourseId:c.id,seenIn:['calendar'],url:`https://learn.uwaterloo.ca/d2l/le/calendar/${encodeURIComponent(c.id)}`}];
 });
}
