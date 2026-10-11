import {courseVisible} from './academic';
import {mergeTasks,courseKey} from './organization';
import {emptyState,type AppState,type Platform,type Course,type Entry,type SyncStatus} from '../domain';
export function applySnapshot(state:AppState,platform:Platform,entries:Entry[],courses:Course[],status:SyncStatus):AppState{
 const s=structuredClone(state); const old=s.sources[platform];
 if(old?.identity&&status.identity&&old.identity!==status.identity){s.sources[platform]={...old,status:'error',error:'identityChanged'};return s}
 s.sources[platform]={...old,...status};if(status.status!=='ok')return s;
 const previous=new Map(s.entries.filter(e=>e.platform===platform).map(e=>[e.id,e]));
 const ids=new Set(entries.map(e=>e.id));const now=new Date().toISOString();
 for(const e of entries){const p=previous.get(e.id);if(p){const before=[p.due,p.start,p.end,p.location,p.seat].join('|');const after=[e.due,e.start,e.end,e.location,e.seat].join('|');if(before!==after)s.changes.unshift({...(e.type==='exam'?{kind:'exam' as const}:{}),id:e.id,title:e.title,at:now,before,after})}}
 s.entries=[...s.entries.filter(e=>e.platform!==platform),...entries.map(e=>({...e,verifiedAt:e.readState==='retained'?e.verifiedAt||previous.get(e.id)?.verifiedAt||(e.gradeOnly?old?.gradesAt:old?.at):status.at||now,readState:e.readState||'fresh' as const})),...[...previous.values()].filter(e=>!ids.has(e.id)).map(e=>({...e,gone:true}))];
 s.courses=[...new Map([...s.courses,...courses].map(c=>[c.id,c])).values()];s.changes=s.changes.slice(0,100);return s;
}
export function visibleEntries(s:AppState):Entry[]{const eligible=s.entries.filter(e=>!e.gradeOnly&&(e.platform!=='cs135'||s.settings.cs135Enabled===true)&&courseVisible(e.course,s,e.readerCourseId)&&!s.overlays[e.id]?.hidden&&(!s.overlays[e.id]?.linkedTo||!s.entries.some(t=>t.id===s.overlays[e.id].linkedTo&&!t.gone&&!s.overlays[t.id]?.hidden)));return mergeTasks(eligible,s)}
export function clearSource(s:AppState,p:Platform):AppState{
 const ids=new Set(s.entries.filter(e=>e.platform===p).map(e=>e.id));const sources={...s.sources};delete sources[p];
 const overlays=Object.fromEntries(Object.entries(s.overlays).filter(([id])=>!ids.has(id)).map(([id,o])=>{const next={...o};if(next.linkedTo&&ids.has(next.linkedTo))delete next.linkedTo;return [id,next]}));
 return {...s,settings:{...s.settings,gradePlans:Object.fromEntries(Object.entries(s.settings.gradePlans||{}).filter(([key])=>!key.startsWith(p+':')))},sources,overlays,entries:s.entries.filter(e=>e.platform!==p),courses:s.courses.filter(c=>!c.id.startsWith(p+':')),sent:Object.fromEntries(Object.entries(s.sent).filter(([key])=>![...ids].some(id=>key.startsWith(id+':')))),changes:s.changes.filter(c=>!ids.has(c.id))};
}
export function possibleDuplicates(s:AppState):Array<[Entry,Entry]>{
 const list=visibleEntries(s);const result:Array<[Entry,Entry]>=[];const norm=(v:string)=>v.toLowerCase().replace(/assignment|\s|[^a-z0-9]/g,'');
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(a.platform!==b.platform&&a.course===b.course&&a.type===b.type&&(norm(a.title)===norm(b.title))&&(a.due||a.start)===(b.due||b.start))result.push([a,b])}return result;
}
export async function loadState():Promise<AppState>{const data=await chrome.storage.local.get('watdesk');const watdesk=data.watdesk as AppState|undefined;return watdesk?.schemaVersion===1?{...watdesk,settings:watdesk.settings.visualVersion===3?watdesk.settings:{...watdesk.settings,theme:'light',visualVersion:3}}:emptyState(navigator.language.startsWith('zh')?'zh-CN':'en')}
let writes:Promise<unknown>=Promise.resolve();
export function mutateState(fn:(s:AppState)=>AppState):Promise<AppState>{const job=writes.then(async()=>{const s=fn(await loadState());await chrome.storage.local.set({watdesk:s});return s});writes=job.catch(()=>{});return job}
