import type {Entry} from '../domain';
import {withTimeout} from '../core/sync';
import {campusInstant} from '../core/util';
export const cs135SubmissionsUrl='https://student.cs.uwaterloo.ca/~cs135/assign/viewsubmissions/index.html';
export interface Cs135Submissions {identity:string;complete:boolean;records:Array<{assignment:string;at:string}>}
// Serialized into the existing page. Read metadata only; never follow source-file links.
export function collectCs135Submissions(rootDocument:Document=document):Cs135Submissions|null{
 const root=rootDocument.querySelector('#submissionsDiv');if(!root)return null;
 const accounts=new Set<string>();const records:Cs135Submissions['records']=[];let complete=true,sections=0;
 for(const heading of root.querySelectorAll('h3')){
  const assignment=heading.textContent?.trim().toLowerCase();if(!assignment||!/^a\d{2}$/.test(assignment))continue;
  const table=heading.nextElementSibling;if(table?.tagName!=='TABLE'){complete=false;continue}sections++;
  for(const row of table.querySelectorAll('tr')){
   const cells=[...row.querySelectorAll('td')];if(cells.length<3){complete=false;continue}
   const batch=cells[0].textContent?.trim()||'',at=cells[1].textContent?.trim()||'';
   if(!/^\d+$/.test(batch)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(at)){complete=false;continue}
   let found=false;
   for(const a of cells[2].querySelectorAll('a[href]')){try{
    const url=new URL(a.getAttribute('href')||'', 'https://student.cs.uwaterloo.ca');
    if(url.origin!=='https://student.cs.uwaterloo.ca'||url.pathname!=='/~cs135/cgi-bin/viewSubmission')continue;
    const user=url.searchParams.get('u')||'',file=url.searchParams.get('f')||'',dir=url.searchParams.get('d')||'';
    if(url.searchParams.get('a')!==assignment||dir!==batch+'_'+at.replace(' ','_').replace(/:/g,'-')||!file.endsWith('.rkt')||!/^[a-z0-9_]{2,32}$/i.test(user))continue;
    accounts.add(user);found=true;
   }catch{/* Not a submission metadata link. */}}
   if(found)records.push({assignment,at});else complete=false;
  }
 }
 if(accounts.size!==1||!records.length)return null;
 return {identity:[...accounts][0],complete:complete&&sections>0,records};
}
function term(at:string){const m=at.match(/^(\d{4})-(\d{2})/);return m?`${m[1]}:${Number(m[2])<=4?'winter':Number(m[2])<=8?'spring':'fall'}`:null}
export function enrichCs135Submissions(entries:Entry[],previous:Entry[],snapshot:Cs135Submissions|null,checkedAt:string):Entry[]{
 const records=snapshot?.records.flatMap(r=>{const at=campusInstant(r.at.replace(' ','T'));return at?[{...r,at,term:term(r.at)}]:[]})||[];
 return entries.map(e=>{
  if(e.type!=='task'||e.platform!=='cs135')return e;
  const match=e.id.match(/^cs135:(\d{4}:(?:winter|spring|fall)):(a\d{2})$/);if(!match)return e;
  const prior=previous.find(p=>p.id===e.id&&!p.gone);
  const applicable=records.filter(r=>r.term===match[1]),hits=applicable.filter(r=>r.assignment===match[2]);
  const latest=hits.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
  if(latest)return {...e,status:'submitted',submissionState:'submitted',submittedAt:latest.at,submissionCheckedAt:checkedAt,url:cs135SubmissionsUrl};
  if(snapshot?.complete&&applicable.length&&records.length===snapshot.records.length)return {...e,status:'open',submissionState:'not-found',submissionCheckedAt:checkedAt,url:cs135SubmissionsUrl};
  return {...e,status:prior?.status==='submitted'?'submitted':'open',submissionState:prior?.status==='submitted'?'submitted':'unknown',submittedAt:prior?.submittedAt,submissionCheckedAt:prior?.submissionCheckedAt,url:cs135SubmissionsUrl};
 });
}
export async function readCs135Submissions():Promise<Cs135Submissions|null>{
 try{
  const tabs=await chrome.tabs.query({url:'https://student.cs.uwaterloo.ca/~cs135/assign/viewsubmissions/*'});
  const loaded=tabs.filter(t=>t.id!=null&&!t.discarded&&!t.frozen&&t.status==='complete');if(!loaded.length)return null;
  const snapshots:Cs135Submissions[]=[];
  for(const tab of loaded){try{
   for(let attempt=0;attempt<12;attempt++){
    const [result]=await withTimeout(chrome.scripting.executeScript({target:{tabId:tab.id!},func:collectCs135Submissions}),5000);
    if(result?.result){snapshots.push(result.result);break}
    if(attempt<11)await new Promise(resolve=>setTimeout(resolve,150));
   }
  }catch{/* Closed or unreadable page: retain saved confirmation. */}}
  if(new Set(snapshots.map(s=>s.identity)).size!==1)return null;
  return snapshots[0]||null;
 }catch{return null}
}
