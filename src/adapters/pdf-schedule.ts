import type {Entry} from '../domain';
import {campusInstant} from '../core/util';
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const datePattern=`(${monthNames.join('|')})\\s+(\\d{1,2}),\\s*(\\d{4})`;
function instant(month:string,day:string,year:string,hour:string,minute:string,period:string){
 const h=Number(hour),m=Number(minute);if(h<1||h>12||m>59)return null;
 try{return campusInstant(`${year}-${String(monthNames.findIndex(v=>v.toLowerCase()===month.toLowerCase())+1).padStart(2,'0')}-${day.padStart(2,'0')}T${String(h%12+(/^PM$/i.test(period)?12:0)).padStart(2,'0')}:${minute}`)}catch{return null}
}
export function parsePdfSchedule(text:string,course:string,courseId:string,topicId:string):Entry[]{
 const normalized=text.replace(/\s+/g,' ');const entries:Entry[]=[];
 const base=(title:string):Entry=>({id:`learn:pdf-schedule:${courseId}:${topicId}:${title.toLowerCase().replace(/\s+/g,'-')}`,platform:'learn',course,title,type:'task',start:null,end:null,due:null,status:'open',readerCourseId:courseId,seenIn:['course-schedule','pdf-schedule'],url:`https://learn.uwaterloo.ca/d2l/le/content/${courseId}/viewContent/${topicId}/View`});
 const assignments=new RegExp(`\\bAssignment\\s+(W\\d+|A\\d+|\\d+)\\s+due\\s+(?:[A-Za-z]+,\\s*)?${datePattern}\\s+at\\s+(\\d{1,2}):(\\d{2})\\s*(AM|PM)\\b`,'gi');
 for(const m of normalized.matchAll(assignments)){const due=instant(m[2],m[3],m[4],m[5],m[6],m[7]);if(due)entries.push({...base(m[1]),category:'assignment',due})}
 const exams=new RegExp(`\\b(Quiz\\s+W?\\d+|Midterm(?:\\s+\\d+)?|Final Exam)\\s+on\\s+(?:[A-Za-z]+,\\s*)?${datePattern}\\s+from\\s+(\\d{1,2}):(\\d{2})\\s*(AM|PM)?\\s*[-–—]\\s*(\\d{1,2}):(\\d{2})\\s*(AM|PM)\\b`,'gi');
 for(const m of normalized.matchAll(exams)){
  // With one suffix, only an increasing clock range within that half-day is explicit.
  if(!m[7]&&(Number(m[5])%12*60+Number(m[6])>=Number(m[8])%12*60+Number(m[9])))continue;
  const start=instant(m[2],m[3],m[4],m[5],m[6],m[7]||m[10]),end=instant(m[2],m[3],m[4],m[8],m[9],m[10]);
  if(start&&end&&start<end)entries.push({...base(m[1]),type:'exam',category:/^Quiz/i.test(m[1])?'quiz':undefined,start,end});
 }
 if(/\bFinal Exam\s*\(Date to be determined\)/i.test(normalized)&&!entries.some(e=>/^Final Exam$/i.test(e.title)))entries.push({...base('Final Exam'),type:'exam'});
 return entries;
}
