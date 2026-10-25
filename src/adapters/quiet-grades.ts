import type {Entry} from '../domain';
import {withTimeout} from '../core/sync';
import {parseCrowdmarkTable,type CMTable} from './crowdmark-dom';
// Grade tables are only read where already rendered. Never navigate or wake a tab.
export async function readLoadedCrowdmarkGrades(entries:Entry[]){
 const fresh=new Map<string,Entry>();
 const tabs=await chrome.tabs.query({url:'https://app.crowdmark.com/student/courses/*'}).catch(()=>[]);
 for(const tab of tabs){
  if(tab.id==null||tab.frozen||tab.discarded||tab.status!=='complete')continue;
  try{
   const [result]=await withTimeout(chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({path:location.pathname,tables:[...document.querySelectorAll('main table')].map(t=>({headers:[...t.querySelectorAll('thead th')].map(h=>h.textContent?.trim()||''),rows:[...t.querySelectorAll('tbody tr')].map(r=>({cells:[...r.querySelectorAll('td')].map(c=>c.textContent?.trim()||''),href:r.querySelector('a[href^="/student/assessments/"]')?.getAttribute('href')||''}))}))})}),5000);
   const data=result?.result;if(!data||!/^\/student\/courses\/[^/]+\/?$/.test(data.path))continue;
   const slug=data.path.split('/').filter(Boolean).at(-1)!;
   const code=entries.find(e=>e.readerCourseId===slug)?.course;if(!code)continue;
   for(const table of data.tables as CMTable[])for(const grade of parseCrowdmarkTable(table,code,'America/Toronto',slug))if(entries.some(e=>e.url===grade.url))fresh.set(grade.url,grade);
  }catch{/* Saved grades retain their previous verification time. */}
 }
 const stamp=new Date().toISOString();
 return entries.map(e=>{const grade=fresh.get(e.url);return grade?{...e,scorePercent:grade.scorePercent,gradeText:grade.gradeText,gradeStatus:grade.gradeStatus,gradeVerifiedAt:stamp,gradeReadState:'fresh' as const}:e});
}
