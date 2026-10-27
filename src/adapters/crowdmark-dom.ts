import {gradeKind} from '../core/grade-kind';
import type {Entry,Course,AppState} from '../domain';
import {retryFrame,waitForTab} from '../core/sync';
import {campusInstant} from '../core/util';
import type {TemporaryPage} from './temporary-tab';
import {withSourceTab} from './source-tabs';
export interface CMTable {headers:string[];rows:Array<{cells:string[];href:string}>}
function dueDate(text:string,zone:string){
 const m=text.match(/([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);if(!m)return null;
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase())+1;if(!month)return null;
 const hour=Number(m[4])%12+(m[6].toUpperCase()==='PM'?12:0);
 return campusInstant(`${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}T${String(hour).padStart(2,'0')}:${m[5]}`,/北美东部|Eastern|\bEDT\b|\bEST\b/i.test(text)?'America/Toronto':zone);
}
export function parseCrowdmarkTable(table:CMTable,course:string,zone:string,courseId=''):Entry[]{
 const col=(name:string)=>table.headers.findIndex(h=>h.toLowerCase()===name.toLowerCase());const title=col('Title'),score=col('Score'),status=col('Status'),due=col('Due date');if(title<0)return [];
 return table.rows.filter(r=>/^\/student\/assessments\/[^/]+\/?$/.test(r.href)).map(r=>{const st=r.cells[status]||'';const raw=r.cells[score]?.trim()||'';const m=raw.match(/^(\d+(?:\.\d+)?)\s*%$/),points=raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);const value=m?Number(m[1]):points&&Number(points[2])>0?Number(points[1])/Number(points[2])*100:undefined;return {id:`crowdmark:page:${r.href.split('/').filter(Boolean).at(-1)}`,platform:'crowdmark',course,title:r.cells[title],type:'task',start:null,end:null,due:due>=0?dueDate(r.cells[due]||'',zone):null,status:value!=null||/^(graded|submitted|completed)\b/i.test(st.trim())?'submitted':'open',url:'https://app.crowdmark.com'+r.href,scorePercent:value,gradeText:value!=null?raw:undefined,gradeStatus:value!=null||/^graded\b/i.test(st.trim())?'graded':/^submitted\b/i.test(st.trim())?'submitted':'pending',readerCourseId:courseId}});
}
export function gradeStats(rows:Entry[]){const scores=rows.filter(e=>gradeKind(e)==='assessment'&&!e.gone&&typeof e.scorePercent==='number'&&Number.isFinite(e.scorePercent)).map(e=>e.scorePercent!);return {count:scores.length,average:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,highest:scores.length?Math.max(...scores):null,lowest:scores.length?Math.min(...scores):null}}
export function gradeCourseKey(e:Entry){return e.readerCourseId||e.course}
export function retainCrowdmarkIds(entries:Entry[],previous:Entry[]){return entries.map(e=>{const old=previous.find(p=>p.platform==='crowdmark'&&p.url.replace(/\/$/,'')===e.url.replace(/\/$/,''));return old?{...e,id:old.id}:e})}

// Self-contained because Chrome serializes this function into the official page.
export async function collectCrowdmarkPage(expected:string,kind:string,expectedCount:number|null,deadline=Date.now()+24000){
 let last='',stable=0;
 for(let attempt=0;attempt<160;attempt++){
  if(Date.now()>=deadline)return {error:"crowdmark-grades-timeout"};
  if(/sign[-_]?in|login/i.test(location.pathname))return {error:'signed-out'};
  const main=document.querySelector('main');const account=document.querySelector('.account-menu__trigger')?.textContent?.replace(/Account menu/g,'').replace(/\s+/g,' ').trim();
  const heading=main?.querySelector('h1')?.textContent?.trim();let result:any;
  if(location.pathname.replace(/\/$/,'')===expected.replace(/\/$/,'')&&heading&&main&&!main.querySelector('[aria-busy="true"], [role="progressbar"]')){
   const text=main.textContent||'';
   if(kind==='courses'){
    const links=[...main.querySelectorAll<HTMLAnchorElement>('a[href^="/student/courses/"]')].filter(a=>/^\/student\/courses\/[^/]+\/?$/.test(a.getAttribute('href')||'')).map(a=>({href:a.getAttribute('href')||'',name:a.querySelector('h2')?.textContent?.trim()||a.textContent?.trim()||'',count:a.textContent?.match(/(\d+)\s+assessments?/i)?.[1]}));
    if(links.length||/your archive is empty|no courses|not enrolled in any courses/i.test(text))result={identity:account,heading,links,zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
   }else{
    const tables=[...main.querySelectorAll('table')].map(t=>({headers:[...t.querySelectorAll('thead th')].map(h=>h.textContent?.trim()||''),rows:[...t.querySelectorAll('tbody tr')].map(r=>({cells:[...r.querySelectorAll('td')].map(c=>c.textContent?.trim()||''),href:r.querySelector('a[href^="/student/assessments/"]')?.getAttribute('href')||''}))})).filter(t=>t.headers.includes('Title')&&t.headers.includes('Score'));
    const count=new Set(tables.flatMap(t=>t.rows.map(r=>r.href).filter(Boolean))).size;
    const explicitEmpty=/no assessments|no assignments|no test results|not made any test results/i.test(text);
    if((count>0&&(expectedCount==null||count>=expectedCount))||(count===0&&(expectedCount===0||expectedCount==null)&&explicitEmpty))result={identity:account,heading,tables,zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
   }
  }
  const fingerprint=result?JSON.stringify(result):'';stable=fingerprint&&fingerprint===last?stable+1:0;last=fingerprint;
  if(result&&stable>=3)return result;
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 return {error:'crowdmark-page-incomplete'};
}

// Read rendered official pages, using the browser's existing login. This does not
// depend on private API endpoints or cookies attached to extension fetches.
async function capture(tabId:number,path:string,kind:'courses'|'assessments',count:number|null=null,deadline=Date.now()+45000,check:()=>void=()=>{}){
 check();
 if(Date.now()>=deadline)throw Error('crowdmark-grades-timeout');
 const current=await chrome.tabs.get(tabId);check();if(current.url!=='https://app.crowdmark.com'+path){
  const [navigation]=await chrome.scripting.executeScript({target:{tabId},func:(path:string)=>{if(location.hostname!=='app.crowdmark.com')return false;const link=[...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find(a=>a.origin===location.origin&&a.pathname.replace(/\/$/,'')===path.replace(/\/$/,''));if(!link)return false;link.click();return true},args:[path,'navigate'] as any}).catch(()=>[]);
  check();if(navigation?.result!==true)await chrome.tabs.update(tabId,{url:'https://app.crowdmark.com'+path});
 }
 await waitForTab(tabId);check();
 const [out]=await retryFrame(()=>chrome.scripting.executeScript({target:{tabId},func:collectCrowdmarkPage,args:[path,kind,count,deadline]}),()=>waitForTab(tabId));
 check();const data=out?.result as any;if(!data||data.error)throw Error(data?.error||'crowdmark-page-unreadable');return data;
}
export async function readCrowdmarkPages(state:AppState,apiLinks?:Array<{href:string;name:string;count?:string}>,options:{page?:TemporaryPage;force?:boolean;onCourse?:(result:{entries:Entry[];courses:Course[]})=>Promise<void>}={}){
 const check=options.page?.check||(()=>{});
 const acquire=<T>(read:(id:number)=>Promise<T>,preferred?:number):Promise<T>=>{check();return options.page?read(options.page.id):withSourceTab('crowdmark',read,preferred)};
 let tab=await acquire(id=>chrome.tabs.get(id));if(!tab.id)throw Error('needs-page');
 let original=tab.url||'https://app.crowdmark.com/student/courses';const deadline=Date.now()+120000;let lastPath='';
 const read=async(path:string,kind:'courses'|'assessments',count:number|null=null)=>acquire(async id=>{
  if(Date.now()>=deadline)throw Error('crowdmark-grades-timeout');
  if(id!==tab.id){tab=await chrome.tabs.get(id);original=tab.url||'https://app.crowdmark.com/student/courses'}
  lastPath=path;return capture(id,path,kind,count,Math.min(deadline,Date.now()+(kind==='courses'?8000:12000)),check);
 },tab.id);
 try{
  // Finish the tab's initial navigation before requesting another document.
  await acquire(async id=>{await waitForTab(id);if(id!==tab.id){tab=await chrome.tabs.get(id);original=tab.url||'https://app.crowdmark.com/student/courses'}},tab.id);
  const list=apiLinks?{links:apiLinks,identity:undefined}:await read('/student/courses','courses');let warning:string|undefined;let archiveAt=state.sources.crowdmark?.gradesArchiveAt;
  const courses:Course[]=[],entries:Entry[]=[];const readIds=new Set<string>();let firstError:unknown;
  const readLinks=async(links:Array<{href:string;name:string;count?:string}>)=>{
   for(const link of links){
    if(!/^\/student\/courses\/[^/]+\/?$/.test(link.href))continue;
    const slug=link.href.split('/').filter(Boolean).at(-1)!;if(readIds.has(slug))continue;
    try{
     const page=await read(link.href.replace(/\/$/,''),'assessments',link.count==null?null:Number(link.count));
     if(list.identity&&page.identity&&page.identity!==list.identity)throw Error('identityChanged');list.identity=page.identity;
     const code=page.heading.match(/^[A-Z]+\s*\d+[A-Z]?/)?.[0]||page.heading;
     const course={id:`crowdmark:${slug}`,code,name:page.heading,term:page.heading.match(/(?:Fall|Winter|Spring)\s+\d{4}/i)?.[0]};courses.push(course);readIds.add(slug);
     const fresh:Entry[]=page.tables.flatMap((table:CMTable)=>parseCrowdmarkTable(table,code,page.zone,slug));entries.push(...fresh);
     await options.onCourse?.({entries:retainCrowdmarkIds(fresh,state.entries),courses:[course]});
    }catch(e){const current=await chrome.tabs.get(tab.id!).catch(()=>null);if(current&&current.url!=='https://app.crowdmark.com'+lastPath)throw e;if(/identityChanged|signed-out/.test(e instanceof Error?e.message:String(e)))throw e;firstError||=e;warning='crowdmark-grades-partial: One or more courses could not refresh. Previous grades retained.'}
   }
  };
  // Current coursework comes first. A slow or empty archive cannot consume its budget.
  await readLinks(list.links);
  if(!apiLinks&&(options.force||!archiveAt||Date.now()-Date.parse(archiveAt)>=86400000)){
   try{const old=await read('/student/course-archive','courses');if(old.identity&&list.identity&&old.identity!==list.identity)throw Error('identityChanged');await readLinks(old.links);archiveAt=new Date().toISOString()}
   catch(e){if(e instanceof Error&&e.message==='identityChanged')throw e;warning||='crowdmark-archive-unavailable'}
  }
  if(firstError&&!readIds.size)throw firstError;
  const retained=state.entries.filter(e=>e.platform==='crowdmark'&&!e.gone&&e.readerCourseId&&!readIds.has(e.readerCourseId));
  if(retained.length){entries.push(...retained.map(e=>({...e,readState:'retained' as const})));courses.push(...state.courses.filter(c=>c.id.startsWith('crowdmark:')&&!readIds.has(c.id.slice(10))))}
  return {entries:[...new Map(retainCrowdmarkIds(entries,state.entries).map(e=>[e.id,e])).values()],courses,identity:list.identity,warning,archiveAt};
 }finally{const current=await chrome.tabs.get(tab.id).catch(()=>null);if(!options.page&&current?.url==='https://app.crowdmark.com'+lastPath&&current.url!==original)await chrome.tabs.update(tab.id,{url:original}).catch(()=>{})}
}
