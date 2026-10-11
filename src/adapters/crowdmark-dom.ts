import type {Entry,Course,AppState} from '../domain';
import {retryFrame,waitForTab} from '../core/sync';
import {campusInstant} from '../core/util';
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
 return table.rows.filter(r=>/^\/student\/assessments\/[^/]+\/?$/.test(r.href)).map(r=>{const st=r.cells[status]||'';const raw=r.cells[score]?.trim()||'';const m=raw.match(/^(\d+(?:\.\d+)?)\s*%$/);return {id:`crowdmark:page:${r.href.split('/').filter(Boolean).at(-1)}`,platform:'crowdmark',course,title:r.cells[title],type:'task',start:null,end:null,due:due>=0?dueDate(r.cells[due]||'',zone):null,status:m||/^(graded|submitted|completed)\b/i.test(st.trim())?'submitted':'open',url:'https://app.crowdmark.com'+r.href,scorePercent:m?Number(m[1]):undefined,gradeStatus:m||/^graded\b/i.test(st.trim())?'graded':/^submitted\b/i.test(st.trim())?'submitted':'pending',readerCourseId:courseId}});
}
export function gradeStats(rows:Entry[]){const scores=rows.filter(e=>!e.gone&&typeof e.scorePercent==='number'&&Number.isFinite(e.scorePercent)).map(e=>e.scorePercent!);return {count:scores.length,average:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,highest:scores.length?Math.max(...scores):null,lowest:scores.length?Math.min(...scores):null}}
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
  if(location.pathname===expected&&heading&&main&&!main.querySelector('[aria-busy="true"], [role="progressbar"]')){
   const text=main.textContent||'';
   if(kind==='courses'){
    const links=[...main.querySelectorAll<HTMLAnchorElement>('a[href^="/student/courses/"]')].filter(a=>/^\/student\/courses\/[^/]+\/?$/.test(a.getAttribute('href')||'')).map(a=>({href:a.getAttribute('href')||'',name:a.querySelector('h2')?.textContent?.trim()||a.textContent?.trim()||'',count:a.textContent?.match(/(\d+)\s+assessments?/i)?.[1]}));
    if(links.length||/your archive is empty|no courses|not enrolled in any courses/i.test(text))result={identity:account,heading,links,zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
   }else{
    const tables=[...main.querySelectorAll('table')].map(t=>({headers:[...t.querySelectorAll('thead th')].map(h=>h.textContent?.trim()||''),rows:[...t.querySelectorAll('tbody tr')].map(r=>({cells:[...r.querySelectorAll('td')].map(c=>c.textContent?.trim()||''),href:r.querySelector('a[href^="/student/assessments/"]')?.getAttribute('href')||''}))})).filter(t=>t.headers.includes('Title')&&t.headers.includes('Score'));
    const count=new Set(tables.flatMap(t=>t.rows.map(r=>r.href).filter(Boolean))).size;
    const explicitEmpty=/no assessments|no assignments|no test results|not made any test results/i.test(text);
    if((count>0&&(expectedCount==null||count>=expectedCount))||(count===0&&expectedCount===0&&explicitEmpty))result={identity:account,heading,tables,zone:Intl.DateTimeFormat().resolvedOptions().timeZone};
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
async function capture(tabId:number,path:string,kind:'courses'|'assessments',count:number|null=null,deadline=Date.now()+45000){
 if(Date.now()>=deadline)throw Error('crowdmark-grades-timeout');
 const current=await chrome.tabs.get(tabId);if(current.url!=='https://app.crowdmark.com'+path)await chrome.tabs.update(tabId,{url:'https://app.crowdmark.com'+path});
 await waitForTab(tabId);
 const [out]=await retryFrame(()=>chrome.scripting.executeScript({target:{tabId},func:collectCrowdmarkPage,args:[path,kind,count,deadline]}),()=>waitForTab(tabId));
 const data=out?.result as any;if(!data||data.error)throw Error(data?.error||'crowdmark-page-unreadable');return data;
}
export async function readCrowdmarkPages(state:AppState,apiLinks?:Array<{href:string;name:string;count?:string}>){
 let tab=await withSourceTab('crowdmark',id=>chrome.tabs.get(id));if(!tab.id)throw Error('needs-page');
 let original=tab.url||'https://app.crowdmark.com/student/courses';const deadline=Date.now()+45000;let lastPath='';
 const read=async(path:string,kind:'courses'|'assessments',count:number|null=null)=>withSourceTab('crowdmark',async id=>{
  if(Date.now()>=deadline)throw Error('crowdmark-grades-timeout');
  if(id!==tab.id){tab=await chrome.tabs.get(id);original=tab.url||'https://app.crowdmark.com/student/courses'}
  lastPath=path;return capture(id,path,kind,count,deadline);
 },tab.id);
 try{
  // Finish the tab's initial navigation before requesting another document.
  await withSourceTab('crowdmark',async id=>{await waitForTab(id);if(id!==tab.id){tab=await chrome.tabs.get(id);original=tab.url||'https://app.crowdmark.com/student/courses'}},tab.id);
  const list=apiLinks?{links:apiLinks,identity:undefined}:await read('/student/courses','courses');let warning:string|undefined;let archived:any[]=[];
  try{if(apiLinks)throw Error('api-list-complete');const old=await read('/student/course-archive','courses');if(old.identity&&list.identity&&old.identity!==list.identity)throw Error('identityChanged');archived=old.links}catch(e){if(e instanceof Error&&e.message==='identityChanged')throw e;if(!apiLinks)warning='crowdmark-archive-unavailable'}
  const links=[...new Map([...list.links,...archived].filter((c:any)=>/^\/student\/courses\/[^/]+\/?$/.test(c.href)).map((c:any)=>[c.href,c])).values()] as Array<{href:string;name:string;count?:string}>;
  const courses:Course[]=[],entries:Entry[]=[];const readIds=new Set<string>();
  for(const link of links){const page=await read(link.href.replace(/\/$/,''),'assessments',link.count==null?null:Number(link.count));if(list.identity&&page.identity&&page.identity!==list.identity)throw Error('identityChanged');list.identity=page.identity;const slug=link.href.split('/').filter(Boolean).at(-1)!;const code=page.heading.match(/^[A-Z]+\s*\d+[A-Z]?/)?.[0]||page.heading;
   courses.push({id:`crowdmark:${slug}`,code,name:page.heading,term:page.heading.match(/(?:Fall|Winter|Spring)\s+\d{4}/i)?.[0]});readIds.add(slug);
   for(const table of page.tables)entries.push(...parseCrowdmarkTable(table,code,page.zone,slug));
  }
  const retained=state.entries.filter(e=>e.platform==='crowdmark'&&!e.gone&&e.readerCourseId&&!readIds.has(e.readerCourseId));
  if(retained.length){entries.push(...retained);warning||='crowdmark-retained-unseen-courses';courses.push(...state.courses.filter(c=>c.id.startsWith('crowdmark:')&&!readIds.has(c.id.slice(10))))}
  return {entries:[...new Map(retainCrowdmarkIds(entries,state.entries).map(e=>[e.id,e])).values()],courses,identity:list.identity,warning};
 }finally{const current=await chrome.tabs.get(tab.id).catch(()=>null);if(current?.url==='https://app.crowdmark.com'+lastPath&&current.url!==original)await chrome.tabs.update(tab.id,{url:original}).catch(()=>{})}
}
