import type {AppState,Entry} from '../domain';
import {campusInstant} from '../core/util';
import {backgroundHtml,parseBackgroundHtml} from './background-html';
// Course outlines (outline.uwaterloo.ca) list every assessment in one "Assessments & Activities" table. Dates are free text,
// so only explicit calendar dates are used: "TBD", weekday patterns and ranges are skipped, never guessed.
const BASE='https://outline.uwaterloo.ca';
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const pad=(n:number)=>String(n).padStart(2,'0');
const month=(name:string)=>MONTHS.findIndex(m=>m.startsWith(name.toLowerCase().slice(0,3)));
export interface OutlineListItem {courses:string;url:string;term?:string;title?:string}
export interface OutlinePage {heading:string;rows:string[][]}
interface Moment {y:number;m:number;d:number;time:string|null}
const MONTH_NAME='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
function clock(text:string){const m=text.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/i);if(!m)return null;const h=Number(m[1]);if(h<1||h>12)return null;return `${pad(h%12+(m[3].toLowerCase()==='p'?12:0))}:${m[2]??'00'}`}
const valid=(y:number,m:number,d:number)=>{const t=new Date(Date.UTC(y,m,d));return t.getUTCFullYear()===y&&t.getUTCMonth()===m&&t.getUTCDate()===d};
// "October 6 & 8", "November 17th and November 19th", "Wednesday October 21", "Friday, September 11, 2026 at 11:00 PM"
export function parseOutlineDates(cell:string,defaultYear:number):Moment[]{
 const text=cell.replace(/ /g,' ').replace(/\*/g,' ').replace(/\s+/g,' ').trim();
 if(!text||/\b(?:tbd|to be (?:scheduled|announced|determined)|registrar)\b/i.test(text))return [];
 // A range such as "October 10-October 18" is not a single assessment date.
 if(new RegExp(`${MONTH_NAME}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*[-–—]\\s*(?:${MONTH_NAME}\\.?\\s+)?\\d{1,2}`,'i').test(text))return [];
 const found:Moment[]=[];let lastMonth=-1,joined=false,i=0;
 const token=new RegExp(`\\b(${MONTH_NAME})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?|(\\d{1,2})(?:st|nd|rd|th)?\\b|(&|\\band\\b|,)`,'gi');
 let m:RegExpExecArray|null;
 while((m=token.exec(text))){
  if(m[1]){lastMonth=month(m[1]);const y=m[3]?Number(m[3]):defaultYear,d=Number(m[2]);if(lastMonth>=0&&valid(y,lastMonth,d))found.push({y,m:lastMonth,d,time:null});joined=false;i=token.lastIndex}
  else if(m[5]){joined=true}
  else if(m[4]&&joined&&lastMonth>=0&&/^\s*(?:&|and|,)\s*$/i.test(text.slice(i,m.index).replace(/\d+(?:st|nd|rd|th)?/g,'')) ){const d=Number(m[4]);if(valid(defaultYear,lastMonth,d)){const prev=found[found.length-1];found.push({y:prev?prev.y:defaultYear,m:lastMonth,d,time:null})}joined=false;i=token.lastIndex}
 }
 const t=found.length===1?clock(text):null;if(t)found[0].time=t;
 return found;
}
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
const keep=(iso:string,now:number)=>Date.parse(iso)>=now-14*86400000;
export function outlineYear(heading:string,now=Date.now()){const m=heading.match(/\b(?:Fall|Winter|Spring)\s+(\d{4})\b/i)||heading.match(/\b(20\d{2})\b/);return m?Number(m[1]):new Date(now).getFullYear()}
export function parseOutlineRows(rows:string[][],opts:{course:string;outlineId:string;year:number;zone?:string;now?:number}):Entry[]{
 const {course,outlineId,year}=opts,zone=opts.zone||'America/Toronto',now=opts.now??Date.now();
 const header=rows.findIndex(r=>r.length>=2&&/component|activity|assessment/i.test(r[0])&&/date|due/i.test(r[1]));
 if(header<0)throw Error('outline-format');
 const url=`${BASE}/viewer/view/${outlineId}#assessments_amp_activities`;const out:Entry[]=[];
 for(const row of rows.slice(header+1)){
  const title=(row[0]||'').replace(/\s+/g,' ').trim();if(!title||title.length>200)continue;
  const dueText=row[1]||'',how=row[2]||'';
  // "Available: … Due: …" windows (online quizzes): both ends must be explicit dates.
  const parts=dueText.split(/\bDue:?\s*/i);const windowed=/\bAvailable\b/i.test(dueText)&&parts.length===2;
  const dates=parseOutlineDates(windowed?parts[1]:dueText,year);if(!dates.length)continue;
  const avail=windowed?parseOutlineDates(parts[0],year)[0]:undefined;
  const inPerson=/in[- ]?(?:person|class)/i.test(how)||/\bin[- ]class\b/i.test(title);
  const exam=/\b(?:midterm|exam|test)\b/i.test(title)&&inPerson;
  dates.forEach((when,idx)=>{
   const day=`${when.y}-${pad(when.m+1)}-${pad(when.d)}`;
   const stampAt=(w:Moment)=>campusInstant(`${w.y}-${pad(w.m+1)}-${pad(w.d)}T${w.time||'23:59:59'}`,zone);
   const at=stampAt(when);if(!at||!keep(at,now))return;
   const label=dates.length>1?`${title} (${idx+1}/${dates.length})`:title;
   const dateOnly=when.time?undefined:day;
   const base={id:`outline:${outlineId}:${slug(title)}:${day}`,platform:'outline' as const,course,title:label,status:'open' as const,url,seenIn:['course-outline'],...(dateOnly?{dateOnly}:{})};
   if(exam)out.push({...base,type:'exam',category:'quiz',start:at,end:null,due:null});
   else out.push({...base,type:'task',category:/\b(?:quiz|test|midterm|exam)\b/i.test(title)?'quiz':'assignment',start:avail?stampAt(avail):null,end:null,due:at});
  });
 }
 return out;
}
const termCode=(t?:string)=>/^\d+$/.test(t||'')?Number(t):0;
const outlineCourse=(courses:string)=>{const m=courses.match(/\b([A-Z]{2,8})\s*(\d{3}[A-Z]?)\b/);return m?`${m[1]} ${m[2]}`:null};
export interface OutlineDeps {list():Promise<unknown>;page(url:string):Promise<OutlinePage>}
async function listOutlines():Promise<unknown>{
 const r=await fetch(`${BASE}/viewer/api/search/?q=`,{credentials:'include',redirect:'manual',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(r.type==='opaqueredirect'||r.status>=300&&r.status<400||r.status===401||r.status===403)throw Error('signed-out');
 if(!r.ok)throw Error('outline-http:'+r.status);
 if(!r.headers.get('content-type')?.includes('json'))throw Error('signed-out');
 return r.json();
}
const liveDeps:OutlineDeps={list:listOutlines,page:async url=>parseBackgroundHtml<OutlinePage>('outline',await backgroundHtml(url))};
export async function readOutline(state:AppState,deps:OutlineDeps=liveDeps,now=Date.now()){
 if(!state.settings.outlineEnabled)throw Error('outline-disabled');
 const raw=await deps.list();if(!Array.isArray(raw))throw Error('outline-format');
 const items=raw.filter((v):v is OutlineListItem=>!!v&&typeof v==='object'&&typeof (v as OutlineListItem).courses==='string'&&/^\/viewer\/view\/[a-z0-9]{4,12}\/?$/.test(String((v as OutlineListItem).url)));
 const latest=Math.max(0,...items.map(v=>termCode(v.term)));
 const current=items.filter(v=>!latest||termCode(v.term)===latest).slice(0,20);
 if(!current.length)throw Error('outline-no-courses');
 const entries:Entry[]=[],failed:string[]=[];
 for(const item of current){
  const course=outlineCourse(item.courses);const id=item.url.replace(/\/$/,'').split('/').pop()!;if(!course)continue;
  try{
   const page=await deps.page(`${BASE}${item.url}`);
   entries.push(...parseOutlineRows(page.rows,{course,outlineId:id,year:outlineYear(page.heading,now),zone:state.settings.zone,now}));
  }catch(e){
   if(e instanceof Error&&e.message==='signed-out')throw e;
   failed.push(`${course}=${e instanceof Error&&e.message==='outline-format'?'layout':'network'}`);
   // Keep the last good read of a course whose page changed or failed to load.
   entries.push(...state.entries.filter(v=>v.platform==='outline'&&v.id.startsWith(`outline:${id}:`)&&!v.gone).map(v=>({...v,readState:'retained' as const})));
  }
 }
 if(failed.length===current.length)throw Error(`outline-unavailable:${failed.join(',')}`);
 return {entries,courses:[],warning:failed.length?`outline-partial:${failed.join(',')}`:undefined};
}
