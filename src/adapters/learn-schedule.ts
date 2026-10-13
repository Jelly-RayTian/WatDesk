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
export async function readLearnSchedule(source:any,course:any,tabId:number):Promise<Entry[]>{
 const le=source.versions.le;const toc=await source.api(`/d2l/api/le/${le}/${encodeURIComponent(course.id)}/content/toc`);
 const topics:any[]=[];const walk=(modules:any[])=>{for(const m of modules||[]){topics.push(...m.Topics||[]);walk(m.Modules)}};walk(toc);
 const schedules=topics.filter(t=>/^(?:Course Schedule|课程日程)$/i.test(t.Title||'')&&t.TopicType===1).slice(0,3);
 const entries:Entry[]=[];
 for(const t of schedules){
  const path=`/d2l/api/le/${le}/${encodeURIComponent(course.id)}/content/topics/${encodeURIComponent(t.Id)}/file?stream=true`;
  const [result]=await chrome.scripting.executeScript({target:{tabId},func:async(path:string)=>{
   const res=await fetch(path,{credentials:'include',signal:AbortSignal.timeout(20000)});
   if(!res.ok||new URL(res.url).origin!==location.origin)throw Error('schedule-unavailable');
   if(!res.headers.get('content-type')?.includes('text/html'))return [];
   const html=await res.text();if(html.length>500000)throw Error('schedule-too-large');
   const doc=new DOMParser().parseFromString(html,'text/html');
   return [...doc.querySelectorAll('table tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>c.textContent?.replace(/\s+/g,' ').trim()||''));
  },args:[path]});entries.push(...parseScheduleRows(result?.result||[],course.code,String(course.id),String(t.Id),topics));
 }
 return entries;
}
