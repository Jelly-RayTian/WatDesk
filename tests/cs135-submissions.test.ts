// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {collectCs135Submissions,enrichCs135Submissions,readCs135Submissions} from '../src/adapters/cs135-submissions';
import type {Entry} from '../src/domain';
const entry=(n:string):Entry=>({id:`cs135:2026:fall:a${n}`,platform:'cs135',course:'CS 135',title:`Assignment ${n}`,type:'task',due:'2026-10-21T01:00:00Z',start:null,end:null,status:'open',url:''});
const row=(n:string,time='2026-10-17 02:20:42',file='answer.rkt')=>`<h3>a${n}</h3><table><tr><td>002</td><td>${time}</td><td><a href="https://student.cs.uwaterloo.ca/~cs135/cgi-bin/viewSubmission?u=student&a=a${n}&d=002_${time.replace(' ','_').replaceAll(':','-')}&f=${file}">${file}</a></td><td><a href="https://student.cs.uwaterloo.ca/~cs135/cgi-bin/viewSubmission?u=student&a=a${n}&f=a${n}_basic.txt">basic test</a></td></tr></table>`;
afterEach(()=>{document.body.innerHTML='';vi.unstubAllGlobals()});
it('reads real list layout using timestamped source-file submissions, without opening code',()=>{
 document.body.innerHTML='<div id="submissionsDiv"><a>a01_marksheet</a>'+row('04')+row('04','2026-10-17 02:19:39')+'</div>';
 const snapshot=collectCs135Submissions()!;expect(snapshot.identity).toBe('student');expect(snapshot.records).toHaveLength(2);
 const es=enrichCs135Submissions([entry('04'),entry('05')],[],snapshot,'2026-10-22T18:00:00Z');expect(es[0]).toMatchObject({status:'submitted',submissionState:'submitted',submittedAt:'2026-10-17T06:20:42Z'});expect(es[1]).toMatchObject({status:'open',submissionState:'not-found'});
});
it('does not mistake marksheets, basic tests alone, or malformed rows for a submission',()=>{
 document.body.innerHTML='<div id="submissionsDiv"><a>a01_marksheet</a>'+row('04','2026-10-17 02:20:42','a04_basic.txt')+'</div>';
 const es=enrichCs135Submissions([entry('04')],[],collectCs135Submissions(),'2026-10-22T18:00:00Z');expect(es[0].status).toBe('open');expect(es[0].submissionState).toBe('unknown');
 document.body.innerHTML='<h1>Sign in</h1>';expect(collectCs135Submissions()).toBeNull();
});
it('retains confirmed submission on unavailable pages and never reuses another term',()=>{
 const old={...entry('04'),status:'submitted' as const,submissionState:'submitted' as const,submissionCheckedAt:'2026-10-21T01:00:00Z'};
 expect(enrichCs135Submissions([entry('04')],[old],null,'2026-10-22T18:00:00Z')[0]).toMatchObject({status:'submitted',submissionCheckedAt:old.submissionCheckedAt});
 document.body.innerHTML='<div id="submissionsDiv">'+row('04','2025-10-17 02:20:42')+'</div>';expect(enrichCs135Submissions([entry('04')],[],collectCs135Submissions(),'2026-10-22T18:00:00Z')[0]).toMatchObject({status:'open',submissionState:'unknown'});
});
it('only reads existing loaded View Submissions pages, never opens or reloads a tab',async()=>{
 const executeScript=vi.fn(),create=vi.fn(),reload=vi.fn();vi.stubGlobal('chrome',{tabs:{query:async()=>[{id:1,discarded:true,status:'complete'}],create,reload},scripting:{executeScript}});
 expect(await readCs135Submissions()).toBeNull();expect(executeScript).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();expect(reload).not.toHaveBeenCalled();
});
