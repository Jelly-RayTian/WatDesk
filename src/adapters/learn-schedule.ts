import {parsePdfSchedule} from './pdf-schedule';
import {backgroundHtml,parseBackgroundHtml,backgroundPdf,parseBackgroundPdf} from './background-html';
import type {Entry} from '../domain';
import {campusInstant} from '../core/util';
function date(text:string){const m=text.replace(/\u00a0/g,' ').match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);if(!m||Number(m[4])<1||Number(m[4])>12)return null;const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[1].toLowerCase())+1;return campusInstant(`${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}T${String(Number(m[4])%12+(m[6].toUpperCase()==='PM'?12:0)).padStart(2,'0')}:${m[5]}`)}
export function parseScheduleRows(rows:string[][],course:string,courseId:string,topicId:string,topics:Array<{Id:number|string;Title:string}>=[]):Entry[]{
 const header=rows.find(r=>r.includes('Due Date')&&r.includes('Available Date'));if(!header)return [];
 const activity=header.indexOf('Activities and Assessments'),available=header.indexOf('Available Date'),dueColumn=header.indexOf('Due Date');if(activity<0)return [];
 return rows.flatMap(row=>{
  const index=row.findIndex(c=>/^Module\s+\d+\s+Quiz$/i.test(c.trim()));if(index<0)return [];
  // Rowspan continuation rows omit leading module/reading cells.
  const shift=index-activity,title=row[index].trim(),due=date(row[dueColumn+shift]||''),start=date(row[available+shift]||'');if(!due||start&&start>=due)return [];
  const matching=topics.filter(t=>t.Title.trim().toLowerCase()===title.toLowerCase()),target=matching.length===1?String(matching[0].Id):topicId;
  return [{id:`learn:schedule:${courseId}:${title.toLowerCase().replace(/\s+/g,'-')}`,platform:'learn' as const,course,title,type:'task' as const,category:'quiz' as const,start,end:null,due,status:'open' as const,readerCourseId:courseId,seenIn:['course-schedule'],url:`https://learn.uwaterloo.ca/d2l/le/content/${encodeURIComponent(courseId)}/viewContent/${encodeURIComponent(target)}/View`}];
 });
}
export async function readLearnSchedule(source:any,course:any,_tabId?:number):Promise<Entry[]>{
 const orgUnitId=String(course.orgUnitId??String(course.id).replace(/^ou/,''));if(!/^\d+$/.test(orgUnitId))throw Error('schedule-course-id');
 const le=source.versions.le;const toc=await source.api(`/d2l/api/le/${le}/${orgUnitId}/content/toc`);
 const roots=Array.isArray(toc)?toc:toc?.Modules;if(!Array.isArray(roots))throw Error('schedule-toc-format');
 const topics:any[]=[];const walk=(modules:any[])=>{for(const m of modules||[]){for(const t of m.Topics||[])topics.push({...t,Id:t.TopicId??t.Id,TopicType:t.TypeIdentifier!=null?(t.TypeIdentifier==='File'?1:0):t.TopicType});walk(m.Modules)}};walk(roots);
 const schedules=topics.filter(t=>/^(?:Course Schedule|课程日程)$/i.test(t.Title||'')&&t.TopicType===1).slice(0,3);
 const entries:Entry[]=[];
 for(const t of schedules){
  if(!/^\d+$/.test(String(t.Id)))throw Error('schedule-topic-id');
  let url=`https://learn.uwaterloo.ca/d2l/api/le/${le}/${orgUnitId}/content/topics/${t.Id}/file?stream=true`;
  if(typeof t.Url==='string'&&t.Url){const target=new URL(t.Url,'https://learn.uwaterloo.ca');if(target.origin!=='https://learn.uwaterloo.ca'||!target.pathname.startsWith('/content/enforced/'+orgUnitId+'-'))throw Error('schedule-file-path');url=target.href}
  if(/\.pdf$/i.test(new URL(url).pathname)){
   const text=await parseBackgroundPdf(await backgroundPdf(url));const parsed=parsePdfSchedule(text,course.code,orgUnitId,String(t.Id));
   if(!parsed.length)throw Error('pdf-schedule-unrecognized');
   entries.push(...parsed.map(e=>({...e,readerCourseId:String(course.id)})));continue;
  }
  let html:string;try{html=await backgroundHtml(url)}catch(e){if(e instanceof Error&&e.message==='expected-html')throw Error('schedule-format-unsupported');throw e}
  const rows=await parseBackgroundHtml<string[][]>('rows',html);entries.push(...parseScheduleRows(rows,course.code,orgUnitId,String(t.Id),topics).map(e=>({...e,readerCourseId:String(course.id)})));
 }
 return entries;
}
