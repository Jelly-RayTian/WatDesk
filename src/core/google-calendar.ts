import type {AppState,Entry} from '../domain';
import {visibleEntries} from './state';
import {stamp} from './util';
import {linkUrl} from './urls';
// One-way mirror of WatDesk deadlines and exams into a dedicated Google calendar. Pure planning lives here; I/O is in background/google-calendar.ts.
export interface GoogleTime {date?:string;dateTime?:string;timeZone?:string}
export interface GoogleEvent {summary:string;description:string;start:GoogleTime;end:GoogleTime;status:'confirmed';colorId:string;reminders:{useDefault:false};source?:{title:string;url:string}}
export interface Desired {id:string;hash:string;event:GoogleEvent}
const MIN=60000,DAY=86400000;
const nextDay=(day:string)=>new Date(Date.parse(day+'T00:00:00Z')+DAY).toISOString().slice(0,10);
const sourceName:Record<string,string>={learn:'LEARN',crowdmark:'Crowdmark',odyssey:'Odyssey',cs135:'CS 135',mobius:'Möbius',sites:'Course site',outline:'Course outline',manual:'WatDesk'};
// One of Google's 11 event colours per course, stable across syncs, so truncated chips are still recognisable.
export const courseColor=(course:string)=>String(1+[...course.toUpperCase().replace(/\s+/g,'')].reduce((h,ch)=>(h*31+ch.charCodeAt(0))>>>0,7)%11);
export function eventForEntry(e:Entry,zone:string):GoogleEvent|null{
 // Month view truncates long chips: skip the course prefix when the title already starts with it.
 const squash=(t:string)=>t.toLowerCase().replace(/\s+/g,'');
 const summary=`${e.course&&!squash(e.title).startsWith(squash(e.course))?e.course+' ':''}${e.title}`.slice(0,300);
 const lines=[sourceName[e.platform]||e.platform];
 if(e.location||e.seat)lines.push([e.location,e.seat&&`Seat ${e.seat}`].filter(Boolean).join(' · '));
 if(e.url&&linkUrl(e.url))lines.push(e.url);
 lines.push('','Synced from WatDesk. Edits here are overwritten by the next sync.');
 const base={summary,description:lines.join('\n'),status:'confirmed' as const,colorId:courseColor(e.course),reminders:{useDefault:false as const},...(e.url&&e.url.startsWith('https://')&&linkUrl(e.url)?{source:{title:'WatDesk',url:e.url}}:{})};
 if(e.dateOnly)return {...base,start:{date:e.dateOnly},end:{date:nextDay(e.dateOnly)}};
 const at=stamp(e);if(!at||Number.isNaN(Date.parse(at)))return null;
 const start=Date.parse(at);
 const end=e.type==='exam'&&e.end&&Date.parse(e.end)>start?Date.parse(e.end):start+(e.type==='exam'?60:15)*MIN;
 return {...base,start:{dateTime:new Date(start).toISOString(),timeZone:zone},end:{dateTime:new Date(end).toISOString(),timeZone:zone}};
}
const b32='0123456789abcdefghijklmnopqrstuv';
async function digest(text:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))}
// Google event ids must be base32hex (a-v, 0-9); a stable id makes every write an idempotent upsert.
export async function googleEventId(entryId:string){
 const bytes=(await digest('watdesk:'+entryId)).subarray(0,16);let bits=0,value=0,out='';
 for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=b32[(value>>>(bits-5))&31];bits-=5}}
 if(bits>0)out+=b32[(value<<(5-bits))&31];return out;
}
const hex=(b:Uint8Array)=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function desiredEvents(state:AppState,now=Date.now()):Promise<Desired[]>{
 const out:Desired[]=[];const from=now-7*DAY,to=now+365*DAY;
 for(const e of visibleEntries(state)){
  if(e.gone||e.gradeOnly)continue;
  const event=eventForEntry(e,state.settings.zone);if(!event)continue;
  const at=Date.parse(event.start.dateTime||event.start.date+'T12:00:00Z');if(!(at>=from&&at<=to))continue;
  out.push({id:await googleEventId(e.id),hash:hex(await digest(JSON.stringify(event))).slice(0,16),event});
 }
 return [...new Map(out.map(d=>[d.id,d])).values()];
}
export function planSync(desired:Desired[],synced:Record<string,string>){
 const ids=new Set(desired.map(d=>d.id));
 return {upserts:desired.filter(d=>synced[d.id]!==d.hash),deletes:Object.keys(synced).filter(id=>!ids.has(id))};
}
