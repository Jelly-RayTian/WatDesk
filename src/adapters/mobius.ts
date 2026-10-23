import type {Entry,AppState} from '../domain';
import {withTimeout} from '../core/sync';
import {campusInstant} from '../core/util';
export interface MobiusSettings {course:string;title:string;rows:string[][]}
function date(text:string):string|null{
 const s=text.replace(/\u00a0/g,' ').trim();
 const m=s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(EDT|EST)\s*(上午|下午)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
 if(!m||!(m[5]||m[9]))return null;let h=Number(m[6]);if(h<1||h>12)return null;h=h%12+(/PM|下午/i.test(m[5]||m[9])?12:0);
 const result=campusInstant(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}T${String(h).padStart(2,'0')}:${m[7]}:${m[8]||'00'}`);
 // Reject contradictory timezone labels rather than shifting a deadline.
 if(result&&new Intl.DateTimeFormat('en',{timeZone:'America/Toronto',timeZoneName:'short'}).format(new Date(result)).includes(m[4].toUpperCase()))return result;
 return null;
}
export function parseMobiusSettings(data:MobiusSettings):Entry|null{
 if(!data||typeof data.course!=='string'||typeof data.title!=='string'||!Array.isArray(data.rows))return null;
 const course=data.course.match(/\b([A-Z]{2,8})\s*(\d{3}[A-Z]?)\b/i),term=data.course.match(/\b(Fall|Winter|Spring)\s+(\d{4})\b/i),title=data.title.trim();
 if(!course||!term||!title||title.length>500||/^(?:View (?:Policies|Settings)|查看设置)$/i.test(title))return null;
 const rows=data.rows.filter(r=>Array.isArray(r)&&r.length>=2&&r.every(v=>typeof v==='string'));
 const dates=rows.find(r=>/^(?:Date|Dates|日期)$/i.test(r[0].trim()))?.slice(1).join(' ')||'';
 const parts=dates.split(/\bEnd\b|结束/i),start=date(parts[0]),due=parts.length===2?date(parts[1]):null;
 if(!due||start&&start>=due)return null;
 const duration=rows.find(r=>/^(?:Time Limit|时间限制)$/i.test(r[0].trim()))?.[1].trim();
 const status=rows.some(r=>/^(?:Status|Submission Status|状态|提交状态)$/i.test(r[0].trim())&&/^(?:Submitted|Completed|已提交|已完成)$/i.test(r[1].trim()))?'submitted':'open';
 const code=`${course[1].toUpperCase()} ${course[2].toUpperCase()}`;
 return {id:`mobius:${encodeURIComponent(data.course.trim().toLowerCase())}:${title.toLowerCase().replace(/\s+/g,'-')}`,platform:'mobius',course:code,title,type:'task',category:/\b(?:quiz|test|midterm|exam)\b|测验|小测/i.test(title)?'quiz':/\b(?:assignment|homework)\b|作业/i.test(title)?'assignment':'task',start,end:null,due,status,url:'https://learn.uwaterloo.ca/d2l/home',duration:duration&&/^\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|分钟|小时)$/i.test(duration)?duration:undefined,seenIn:['mobius-settings']};
}
export function mergeMobiusSnapshot(previous:Entry[],fresh:Entry[]):Entry[]{const ids=new Set(fresh.map(e=>e.id));return [...previous.filter(e=>e.platform==='mobius'&&!e.gone&&!ids.has(e.id)).map(e=>({...e,readState:'retained' as const})),...fresh]}
export async function readMobius(state:AppState){
 if(!state.settings.mobiusEnabled)throw Error('mobius-disabled');
 const tabs=await chrome.tabs.query({url:'https://uwmo.mobius.cloud/*'});const entries:Entry[]=[];
 for(const tab of tabs){if(tab.id==null||tab.discarded||tab.frozen||tab.status!=='complete')continue;
  // Inject a read-only metadata collector; it never clicks or fetches the LTI launch.
  try{const [result]=await withTimeout(chrome.scripting.executeScript({target:{tabId:tab.id},func:collectMobiusSettings}),5000);
  const entry=result?.result&&parseMobiusSettings(result.result);if(entry)entries.push(entry)}catch{/* Keep other readable settings pages and previously saved records. */}
 }
 if(!entries.length)throw Error('mobius-settings-required');
 return {entries:mergeMobiusSnapshot(state.entries,[...new Map(entries.map(e=>[e.id,e])).values()]),courses:[]};
}
// Self-contained for executeScript. Only settings pages qualify; never inspect a quiz attempt.
export function collectMobiusSettings():MobiusSettings|null{
 const headings=[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent?.trim()||'');
 if(!/View (?:Policies|Settings)|查看设置/i.test(document.title+' '+headings.join(' ')))return null;
 const title=document.querySelector('h1')?.textContent?.trim();
 const course=[...document.querySelectorAll('.breadcrumb li,.breadcrumbs li,a,.className,.class-name')].map(e=>e.textContent?.replace(/\s+/g,' ').trim()||'').find(t=>/^[A-Z]{2,8}\s*\d{3}[A-Z]?\b.*\b(?:Fall|Winter|Spring)\s+\d{4}\b/i.test(t)&&t.length<180);
 if(!title||!course)return null;
 const rows=[...document.querySelectorAll('#reviewPolicies #launchInfo li.list-group-item,#reviewPolicies #launchInfo li.row')].map(r=>[...r.children].filter(c=>c.tagName==='DIV').map(c=>c.textContent?.replace(/\s+/g,' ').trim()||''));
 rows.push(...[...document.querySelectorAll('#reviewPolicies table tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>c.textContent?.replace(/\s+/g,' ').trim()||'')));
 return {title,course,rows:rows.filter(r=>/^(Time Limit|Date|Dates|Status|Submission Status|时间限制|日期|状态|提交状态)$/i.test(r[0]||''))};
}
