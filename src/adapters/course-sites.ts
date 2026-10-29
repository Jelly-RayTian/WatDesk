import type {AppState,Course,Entry} from '../domain';
import {campusInstant} from '../core/util';
import {campusTerm} from '../core/academic';
import {courseSites,readableSiteIds} from '../core/course-sites';
// Course websites are hand-written and differ per course. Each parser below targets one site's current markup and
// refuses to guess: a page that does not match throws, and the previous data for that course is kept instead.
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const BASE='https://student.cs.uwaterloo.ca/';
export const siteText=(html:string)=>html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&ndash;|&#8211;/gi,'–').replace(/\s+/g,' ').trim();
const month=(name:string)=>MONTHS.findIndex(m=>m.startsWith(name.toLowerCase().slice(0,3)));
const pad=(n:number)=>String(n).padStart(2,'0');
// "5pm", "5:00pm", "7:00 pm" -> "17:00"
function clock(text:string){const m=text.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/i);if(!m)return null;let h=Number(m[1])%12;if(m[3].toLowerCase()==='p')h+=12;return `${pad(h)}:${m[2]??'00'}`}
function instant(year:number,monthIndex:number,day:number,time:string|null){return time?campusInstant(`${year}-${pad(monthIndex+1)}-${pad(day)}T${time}`):null}
const keep=(iso:string|null,now:number)=>!iso||Date.parse(iso)>=now-14*86400000;
function base(course:string,id:string,title:string,url:string):Omit<Entry,'type'|'start'|'end'|'due'>{return {id:`sites:${id}`,platform:'sites',course,title,status:'open',url,seenIn:['course-site']}}

// CS 241: "<li>Assignment 1 (due September 25th at 5:00pm)</li>"; the page gives no year, so use the nearest sensible one.
export function parseCs241(html:string,now=Date.now()):Entry[]{
 const url=`${BASE}~cs241/assignments/`;const out:Entry[]=[];
 const clean=html.replace(/<!--[\s\S]*?-->/g,'');
 for(const li of clean.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){
  const text=siteText(li[1]);const m=text.match(/^(Assignment\s+\d+)\s*\(due\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+([^)]+)\)/i);if(!m)continue;
  const mi=month(m[2]),time=clock(m[4]);if(mi<0||!time)continue;
  const year=new Date(now).getFullYear();let due=instant(year,mi,Number(m[3]),time);if(due&&Date.parse(due)<now-150*86400000)due=instant(year+1,mi,Number(m[3]),time);
  if(!due||!keep(due,now))continue;
  out.push({...base('CS 241',`cs241:${m[1].toLowerCase().replace(/\s+/g,'-')}`,m[1],url),type:'task',category:'assignment',start:null,end:null,due});
 }
 if(!out.length&&!/Assignment\s+\d+/.test(siteText(html)))throw Error('site-format:cs241');
 return out;
}

// CS 240: a table of [name, release, due]; the exam row holds start and end times instead.
const longDate=/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})(?:\s*,?\s*at\s*([\d:]+\s*[ap]\.?m))?/i;
export function parseCs240(html:string,term:string,now=Date.now()):Entry[]{
 const url=`${BASE}~cs240/${term}/assignments.phtml`;const out:Entry[]=[];const clean=html.replace(/<!--[\s\S]*?-->/g,'');
 const rows=[...clean.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];let sawHeader=false;
 for(const row of rows){
  const head=row[1].match(/<th\b[^>]*scope=['"]row['"][^>]*>([\s\S]*?)<\/th>/i);if(!head){if(/Due date/i.test(row[1]))sawHeader=true;continue}
  const title=siteText(head[1]);const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>siteText(c[1]));
  const first=cells[0]?.match(longDate),second=cells[1]?.match(longDate);if(!title||!second)continue;
  const at=(m:RegExpMatchArray)=>instant(Number(m[3]),month(m[1]),Number(m[2]),clock(m[4]||'')||(m[4]?null:'23:59'));
  const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(/midterm|exam/i.test(title)&&first?.[4]&&second[4]){
   const start=at(first),end=at(second);if(!start||!end||!keep(end,now))continue;
   out.push({...base('CS 240',`cs240:${slug}`,title,url),type:'exam',start,end,due:null});continue;
  }
  const due=at(second);if(!due||!keep(due,now))continue;
  out.push({...base('CS 240',`cs240:${slug}`,title,url),type:'task',category:/aid|integrity/i.test(title)?'content':'assignment',start:null,end:null,due});
 }
 if(!sawHeader&&!out.length)throw Error('site-format:cs240');
 return out;
}

// CS 145: "Fall 2026 Midterm 1 date: Thursday, October 8th, 2026, 7:00 pm - 8:50 pm"
export function parseCs145(html:string,now=Date.now()):Entry[]{
 const url=`${BASE}~cs145/calendar.shtml`;const text=siteText(html);const out:Entry[]=[];
 for(const m of text.matchAll(/Midterm\s*(\d)\s*(?:date)?\s*:\s*[A-Za-z]+,\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4}),\s*(\d{1,2}:\d{2}\s*[ap]\.?m)\s*[-–]\s*(\d{1,2}:\d{2}\s*[ap]\.?m)/gi)){
  const mi=month(m[2]);if(mi<0)continue;const start=instant(Number(m[4]),mi,Number(m[3]),clock(m[5])),end=instant(Number(m[4]),mi,Number(m[3]),clock(m[6]));
  if(!start||!end||!keep(end,now))continue;
  out.push({...base('CS 145',`cs145:midterm-${m[1]}`,`Midterm ${m[1]}`,url),type:'exam',start,end,due:null});
 }
 if(!out.length&&!/Calendar/i.test(text))throw Error('site-format:cs145');
 return out;
}

const siteTerm=(now:number,zone:string)=>{const t=campusTerm(new Date(now),zone);const season=/winter/i.test(t)?'w':/spring/i.test(t)?'s':'f';return `${season}${t.match(/\d{4}/)?.[0].slice(2)}`};
export interface SitesResult {entries:Entry[];courses:Course[];warning?:string}
export async function readCourseSites(state:AppState,fetcher:typeof fetch=fetch,now=Date.now()):Promise<SitesResult>{
 const ids=readableSiteIds(state.settings.courseSites);if(!ids.length)return {entries:[],courses:[]};
 const term=siteTerm(now,state.settings.zone);
 const jobs:Record<string,{url:string;parse:(html:string)=>Entry[]}>={
  cs241:{url:`${BASE}~cs241/assignments/`,parse:h=>parseCs241(h,now)},
  cs240:{url:`${BASE}~cs240/${term}/assignments.phtml`,parse:h=>parseCs240(h,term,now)},
  cs145:{url:`${BASE}~cs145/calendar.shtml`,parse:h=>parseCs145(h,now)},
 };
 const entries:Entry[]=[],courses:Course[]=[],failed:string[]=[],reasons:string[]=[];
 const why=(e:unknown)=>{const m=e instanceof Error?e.message:String(e);return m.startsWith('site-http:')?`http-${m.split(':')[2]}`:m.startsWith('site-format')?'layout':'network'};
 for(const id of ids){
  const site=courseSites.find(c=>c.id===id)!;const job=jobs[id];if(!job)continue;
  try{
   const r=await fetcher(job.url,{signal:AbortSignal.timeout(20000),cache:'no-store'});if(r.url&&new URL(r.url).hostname!=='student.cs.uwaterloo.ca')throw Error(`site-http:${id}:redirect`);if(!r.ok)throw Error(`site-http:${id}:${r.status}`);
   entries.push(...job.parse(await r.text()));courses.push({id:`sites:${id}`,code:site.code,name:site.name||site.code});
  }catch(e){
   failed.push(id);reasons.push(`${id}=${why(e)}`);
   // Keep what was read last time rather than dropping a course because its page changed or was unreachable.
   entries.push(...state.entries.filter(e=>e.platform==='sites'&&e.id.startsWith(`sites:${id}:`)&&!e.gone).map(e=>({...e,readState:'retained' as const})));
   courses.push({id:`sites:${id}`,code:site.code,name:site.name||site.code});
  }
 }
 if(failed.length===ids.length)throw Error(`sites-unavailable:${reasons.join(',')}`);
 return {entries,courses,warning:failed.length?`sites-partial:${reasons.join(',')}`:undefined};
}
