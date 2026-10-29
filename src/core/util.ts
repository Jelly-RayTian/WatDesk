import {safeUrl,linkUrl} from './urls';
import {isCourseSite} from './course-sites';
import {isUsageStats} from './stats';
import {meetingEntries,meetingForEntry} from './academic';
import {personallyDone,personalNote} from './organization';
import {visibleEntries} from './state';
import {Temporal} from '@js-temporal/polyfill';
import {type AppState,type Entry} from '../domain';
export function campusInstant(text:string,zone='America/Toronto'):string|null{try{return Temporal.PlainDateTime.from(text).toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().toString()}catch{return null}}
export const stamp=(e:Entry)=>e.type==='exam'?e.start:e.due;
export function fmt(iso:string|null,locale:string,zone:string,withTime=true):string{if(!iso)return locale==='zh-CN'?'尚未公布':'Not published';return new Intl.DateTimeFormat(locale,{timeZone:zone,month:'short',day:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit',hourCycle:'h23' as const}:{} )}).format(new Date(iso))}
export function fmtEntry(e:Entry,locale:string,zone:string,withTime=true):string{return e.dateOnly?fmt(e.dateOnly+'T12:00:00Z',locale,'UTC',false):fmt(stamp(e),locale,zone,withTime)}
export function localInput(iso:string|null,zone:string):string{return iso?Temporal.Instant.from(iso).toZonedDateTimeISO(zone).toPlainDateTime().toString().slice(0,16):''}
const courseKey=(c:string)=>c.toLowerCase().replace(/[^a-z0-9]/g,'');
// The same exam can arrive from several sources under different titles (e.g. LEARN "MATH 135 Quiz 1" and Möbius "Quiz W4"). Entries of one course, or identical windows with a missing course, describe one sitting rather than a clash.
const sameExam=(a:Entry,b:Entry)=>{const ca=courseKey(a.course||''),cb=courseKey(b.course||'');return ca!==''&&ca===cb||(ca===''||cb==='')&&a.start===b.start&&a.end===b.end};
export function examConflicts(entries:Entry[]):Array<[Entry,Entry]>{const es=entries.filter(e=>e.type==='exam'&&e.start&&e.end&&!e.gone);const out:Array<[Entry,Entry]>=[];for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++)if(es[i].start!<es[j].end!&&es[j].start!<es[i].end!&&!sameExam(es[i],es[j]))out.push([es[i],es[j]]);return out}
export function planReminders(s:AppState,now:string){
 const at=Date.parse(now);const out:Array<{key:string;entry:Entry;lead:number}>=[];
 if(!s.settings.notifications)return out;
 for(const e of [...visibleEntries(s),...meetingEntries(s,at,2)]){
  const time=stamp(e);if(!time||e.gone||e.status==='submitted'||personallyDone(e,s)||s.settings.mutedCourses.includes(e.course))continue;
  const due=Date.parse(e.dateOnly?campusInstant(e.dateOnly+'T09:00',s.settings.zone)!:time);
  const custom=s.settings.courseReminders?.[e.course];
  const leads=[...new Set(e.category==='class'?[meetingForEntry(e,s)?.leadMinutes??15]:e.type==='exam'?custom?.examLeads||s.settings.examLeads:[custom?.taskLead??s.settings.taskLead])].sort((a,b)=>a-b);
  const lead=leads.find(v=>due-v*60000<=at&&(at<due||v===0&&at-due<5*60000));
  if(lead===undefined)continue;
  const key=`${e.id}:${time}:${lead}`;
  if(!s.sent[key])out.push({key,entry:e,lead});
 }
 return out;
}
export {safeUrl,linkUrl} from './urls';
const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r/g,'');
function fold(line:string){let bytes=0,out='';for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>75){out+='\r\n ';bytes=1}out+=c;bytes+=n}return out}
export function exportIcs(s:AppState){const utc=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const now=utc(new Date().toISOString());const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WatDesk//Academic Workspace//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:WatDesk'];
 for(const e of [...visibleEntries(s),...meetingEntries(s,Date.now(),90)]){const date=stamp(e);if(!date||e.gone||s.overlays[e.id]?.hidden||s.overlays[e.id]?.linkedTo)continue;lines.push('BEGIN:VEVENT',`UID:${e.id.replace(/[^a-z0-9._-]/gi,'-')}@watdesk.local`,`DTSTAMP:${now}`,e.dateOnly?`DTSTART;VALUE=DATE:${e.dateOnly.replace(/-/g,'')}`:`DTSTART:${utc(date)}`,`SUMMARY:${esc(`${e.course} ${e.title}`)}`);if(e.type==='exam'&&e.end)lines.push(`DTEND:${utc(e.end)}`);if(e.location)lines.push(`LOCATION:${esc(e.location)}`);lines.push(`DESCRIPTION:${esc(`${e.platform}${e.seat?` | ${s.settings.locale==='zh-CN'?'座位':'Seat'}: ${e.seat}`:''}\n${e.start&&e.type==='task'?`Opens: ${e.start}\n`:''}${e.duration?`Time limit: ${e.duration}\n`:''}${personalNote(e,s)}`)}`);if(safeUrl(e.url)&&e.url)lines.push(`URL:${new URL(e.url).href}`);lines.push('END:VEVENT')}lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';}
export function validateBackup(text:string):AppState{
 if(new TextEncoder().encode(text).length>10*1024*1024)throw Error('restoreError');const s=JSON.parse(text);
 if(s.schemaVersion!==1||!s.settings||!['en','zh-CN'].includes(s.settings.locale)||!['system','light','dark'].includes(s.settings.theme)||!Array.isArray(s.entries)||!Array.isArray(s.courses)||!s.sources||!s.overlays||!s.sent||!Array.isArray(s.changes))throw Error('restoreError');
 if(typeof s.settings.zone!=='string')throw Error('restoreError');
 new Intl.DateTimeFormat('en',{timeZone:s.settings.zone});
 if(!Number.isFinite(s.settings.taskLead)||s.settings.taskLead<0||s.settings.taskLead>525600||!Array.isArray(s.settings.examLeads)||s.settings.examLeads.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>525600)||!Array.isArray(s.settings.mutedCourses))throw Error('restoreError');
 for(const e of s.entries){if(typeof e.id!=='string'||typeof e.title!=='string'||typeof e.course!=='string'||!['learn','crowdmark','odyssey','cs135','mobius','sites','manual'].includes(e.platform)||!['exam','task'].includes(e.type)||!['open','submitted'].includes(e.status)||typeof e.url!=='string'||!(e.platform==='manual'?safeUrl(e.url):linkUrl(e.url)))throw Error('restoreError');for(const k of ['start','end','due'])if(e[k]!==null&&(typeof e[k]!=='string'||!Number.isFinite(Date.parse(e[k]))))throw Error('restoreError')}
 if(s.settings.visualVersion!==undefined&&(!Number.isInteger(s.settings.visualVersion)||s.settings.visualVersion<0))throw Error('restoreError');
 if(s.settings.activeTerm!==undefined&&(typeof s.settings.activeTerm!=='string'||s.settings.activeTerm.length>100))throw Error('restoreError');
 if(s.settings.classMeetings!==undefined&&(!Array.isArray(s.settings.classMeetings)||s.settings.classMeetings.length>100||s.settings.classMeetings.some((m:any)=>!m||['id','course','title','start','end','location'].some(k=>typeof m[k]!=='string')||!m.id||m.id.length>100||!Number.isInteger(m.weekday)||m.weekday<0||m.weekday>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.end)||m.end<=m.start||!Number.isFinite(m.leadMinutes)||m.leadMinutes<0||m.leadMinutes>1440||typeof m.enabled!=='boolean')))throw Error('restoreError');
 if(s.settings.classMeetings&&new Set(s.settings.classMeetings.map((m:any)=>m.id)).size!==s.settings.classMeetings.length)throw Error('restoreError');
 if(s.settings.courseReminders!==undefined){if(!s.settings.courseReminders||typeof s.settings.courseReminders!=='object'||Array.isArray(s.settings.courseReminders))throw Error('restoreError');for(const r of Object.values(s.settings.courseReminders) as any[])if(!r||!Number.isFinite(r.taskLead)||r.taskLead<0||r.taskLead>525600||!Array.isArray(r.examLeads)||r.examLeads.length>10||r.examLeads.some((v:any)=>!Number.isFinite(v)||v<0||v>525600))throw Error('restoreError')}
 if(s.settings.hiddenCourses!==undefined&&(!Array.isArray(s.settings.hiddenCourses)||s.settings.hiddenCourses.some((c:unknown)=>typeof c!=='string')))throw Error('restoreError');
 if(s.settings.gradePlans!==undefined){if(!s.settings.gradePlans||typeof s.settings.gradePlans!=='object'||Array.isArray(s.settings.gradePlans))throw Error('restoreError');for(const p of Object.values(s.settings.gradePlans) as any[]){if(!p||!p.weights||typeof p.weights!=='object'||Array.isArray(p.weights)||Object.values(p.weights).some((v:any)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)||p.target!==undefined&&(typeof p.target!=='number'||!Number.isFinite(p.target)||p.target<0||p.target>100))throw Error('restoreError')}}
 if(s.settings.syncIntervalMinutes!==undefined&&(!Number.isInteger(s.settings.syncIntervalMinutes)||s.settings.syncIntervalMinutes!==0&&(s.settings.syncIntervalMinutes<30||s.settings.syncIntervalMinutes>10080)))throw Error('restoreError');
 if(s.settings.palette!==undefined&&!['forest','ocean','plum','graphite','glass'].includes(s.settings.palette))throw Error('restoreError');
 if(s.settings.schoolAutoNext!==undefined&&typeof s.settings.schoolAutoNext!=='boolean')throw Error('restoreError');
 if(s.settings.mobiusEnabled!==undefined&&typeof s.settings.mobiusEnabled!=='boolean')throw Error('restoreError');
 if(s.settings.cs135Enabled!==undefined&&typeof s.settings.cs135Enabled!=='boolean')throw Error('restoreError');
 if(s.settings.usageStats!==undefined&&!isUsageStats(s.settings.usageStats))throw Error('restoreError');
 if(s.settings.courseSites!==undefined&&(!Array.isArray(s.settings.courseSites)||!s.settings.courseSites.every(isCourseSite)))throw Error('restoreError');
 if(s.settings.onboardingComplete!==undefined&&typeof s.settings.onboardingComplete!=='boolean')throw Error('restoreError');
 if(typeof s.settings.notifications!=='boolean'||s.settings.examLeads.length>10||s.settings.mutedCourses.some((v:unknown)=>typeof v!=='string'))throw Error('restoreError');
 const record=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!record(s.overlays)||!record(s.sources)||!record(s.sent))throw Error('restoreError');
 // JSON.parse keeps '__proto__' as an own key; assigning it later would rewrite an object's prototype.
 const unsafeKey=(k:string)=>k==='__proto__'||k==='constructor'||k==='prototype';
 for(const map of [s.overlays,s.sources,s.sent,s.settings.gradePlans,s.settings.courseReminders])if(record(map)&&Object.keys(map).some(unsafeKey))throw Error('restoreError');
 for(const e of s.entries)if(unsafeKey(String(e.id)))throw Error('restoreError');
 const ids=new Set<string>();for(const e of s.entries){if(e.dateOnly!==undefined&&(typeof e.dateOnly!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.dateOnly)||!campusInstant(e.dateOnly+'T23:59:59')))throw Error('restoreError');if(ids.has(e.id))throw Error('restoreError');ids.add(e.id);for(const k of ['location','seat','duration'])if(e[k]!==undefined&&typeof e[k]!=='string')throw Error('restoreError')}
 for(const c of s.courses)if(!c||typeof c.id!=='string'||typeof c.code!=='string'||typeof c.name!=='string'||c.term!==undefined&&typeof c.term!=='string')throw Error('restoreError');
 for(const o of Object.values(s.overlays) as any[]){if(!record(o)||o.note!==undefined&&typeof o.note!=='string'||o.linkedTo!=null&&typeof o.linkedTo!=='string'||o.keepSeparate!==undefined&&typeof o.keepSeparate!=='boolean'||o.done!==undefined&&typeof o.done!=='boolean'||o.hidden!==undefined&&typeof o.hidden!=='boolean')throw Error('restoreError')}

 for(const e of s.entries)if(e.gradeKind!==undefined&&!['assessment','overall','average','class-average'].includes(e.gradeKind))throw Error('restoreError');
 for(const st of Object.values(s.sources) as any[])if(!record(st)||!['idle','syncing','ok','error'].includes(st.status)||st.error!==undefined&&typeof st.error!=='string'||st.identity!==undefined&&typeof st.identity!=='string')throw Error('restoreError');
 for(const c of s.changes)if(!c||['id','title','at','before','after'].some(k=>typeof c[k]!=='string'))throw Error('restoreError');
 for(const v of Object.values(s.sent))if(typeof v!=='string')throw Error('restoreError');
 const validDate=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 for(const e of s.entries){if(e.submissionState!==undefined&&!['submitted','not-found','unknown'].includes(e.submissionState)||e.submittedAt!==undefined&&!validDate(e.submittedAt)||e.submissionCheckedAt!==undefined&&!validDate(e.submissionCheckedAt))throw Error('restoreError')}
 for(const st of Object.values(s.sources) as any[])if(st.issues!==undefined&&(!Array.isArray(st.issues)||st.issues.some((i:any)=>!record(i)||typeof i.course!=='string'||typeof i.tool!=='string'||typeof i.code!=='string'||!['unavailable','failed'].includes(i.kind)||i.status!==undefined&&(!Number.isInteger(i.status)||i.status<0||i.status>599))))throw Error('restoreError');
 for(const st of Object.values(s.sources) as any[])if(st.at!==undefined&&!validDate(st.at))throw Error('restoreError');
 for(const c of s.changes)if(!validDate(c.at))throw Error('restoreError');
 for(const e of s.entries)if(e.gradeVerifiedAt!==undefined&&!validDate(e.gradeVerifiedAt)||e.gradeReadState!==undefined&&!['fresh','retained'].includes(e.gradeReadState))throw Error('restoreError');
 for(const e of s.entries)if(e.verifiedAt!==undefined&&!validDate(e.verifiedAt)||e.readState!==undefined&&!['fresh','retained'].includes(e.readState)||e.gradeText!==undefined&&typeof e.gradeText!=='string')throw Error('restoreError');
 for(const e of s.entries)if(e.scorePercent!==undefined&&(typeof e.scorePercent!=='number'||!Number.isFinite(e.scorePercent)||e.scorePercent<0)||e.gradeStatus!==undefined&&!['graded','submitted','pending'].includes(e.gradeStatus))throw Error('restoreError');
 for(const e of s.entries)if(e.seenIn!==undefined&&(!Array.isArray(e.seenIn)||e.seenIn.some((v:unknown)=>typeof v!=='string'))||e.readerCourseId!==undefined&&typeof e.readerCourseId!=='string')throw Error('restoreError');
 return s;
}
