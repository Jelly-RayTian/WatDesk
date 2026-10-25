import {withTemporaryTab} from './temporary-tab';
import type {AppState,Course,Entry} from '../domain';
// Unmodified upstream WATnow reader; MIT attribution ships with the plugin.
// @ts-ignore vendored JavaScript boundary
import {readCrowdmark} from '../vendor/watnow/data/crowdmark-source.js';
import {retainCrowdmarkIds,readCrowdmarkPages} from './crowdmark-dom';
import {ensureCrowdmarkBridge,crowdmarkRelay} from './crowdmark-bridge';
export async function readCrowdmarkApi(state:AppState){
 try{await ensureCrowdmarkBridge()}catch{/* Worker fetch can work without a tab. */}
 const learn=state.courses.filter(c=>c.id.startsWith('learn:')).map(c=>({...c,id:c.id.slice(6)}));
 const result=await readCrowdmark({school:'uwaterloo'},learn,{relay:crowdmarkRelay});
 if(result.status!=='ok')throw Error(`${result.status}: ${result.report?.error||'Crowdmark read failed'}`);
 const entries:Entry[]=[],courses:Course[]=[];const readSlugs=new Set<string>();
 for(const c of result.courses){const slug=new URL(c.homeUrl).pathname.split('/').filter(Boolean).at(-1)!;if(!c.readFailed)readSlugs.add(slug);courses.push({id:'crowdmark:'+slug,code:c.code,name:c.code,term:slug.replace(/-/g,' ').match(/(?:fall|winter|spring)\s+\d{4}/i)?.[0]})}
 for(const i of result.items){const slug=new URL(i.listUrl).pathname.split('/').filter(Boolean).at(-1)!;readSlugs.add(slug);const code=learn.find(c=>c.id===i.courseId)?.code||result.courses.find((c:any)=>c.id===i.courseId)?.code||'';
  const old=state.entries.find(e=>e.platform==='crowdmark'&&e.url===i.url);
  entries.push({id:'crowdmark:'+i.id,platform:'crowdmark',course:code,title:i.title,type:'task',start:null,end:null,due:i.dueAt,status:i.status,url:i.url,readerCourseId:slug,seenIn:i.seenIn,scorePercent:old?.scorePercent,gradeText:old?.gradeText,gradeVerifiedAt:old?.gradeVerifiedAt||state.sources.crowdmark?.gradesAt,gradeReadState:'retained',gradeStatus:old?.scorePercent!=null?'graded':i.status==='submitted'?'submitted':'pending'});
 }
 // Upstream reads current-term deadlines. Retain history and failed-course data.
 const urls=new Set(entries.map(e=>e.url));
 entries.push(...state.entries.filter(e=>e.platform==='crowdmark'&&!e.gone&&!urls.has(e.url)&&(!readSlugs.has(e.readerCourseId||'')||e.scorePercent!=null||e.due==null)).map(e=>({...e,readState:'retained' as const})));
 return {entries:retainCrowdmarkIds(entries,state.entries),courses,warning:result.failedCourseIds.size?'crowdmark-partial: Previous records retained.':undefined};
}
export async function enrichCrowdmarkGrades(state:AppState,options:NonNullable<Parameters<typeof readCrowdmarkPages>[2]>&{temporary?:boolean;signal?:AbortSignal}={}){if(!options.temporary)return readCrowdmarkPages(state,undefined,options);return withTemporaryTab('https://app.crowdmark.com/student/courses',page=>readCrowdmarkPages(state,undefined,{...options,page}),{signal:options.signal,timeout:125000})}
