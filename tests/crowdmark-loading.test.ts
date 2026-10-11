// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {collectCrowdmarkPage,retainCrowdmarkIds,gradeCourseKey,parseCrowdmarkTable} from '../src/adapters/crowdmark-dom';
afterEach(()=>{vi.useRealTimers();document.body.innerHTML=''});
it('waits past a CSR heading and empty table until expected assessment rows settle',async()=>{
 vi.useFakeTimers();const path=location.pathname;
 document.body.innerHTML='<div class="account-menu__trigger">Student Account menu</div><main><h1>Course</h1><table><thead><tr><th>Title</th><th>Score</th></tr></thead><tbody></tbody></table></main>';
 let resolved=false;const pending=collectCrowdmarkPage(path,'assessments',1).then(r=>{resolved=true;return r});
 await vi.advanceTimersByTimeAsync(2000);expect(resolved).toBe(false);
 document.querySelector('tbody')!.innerHTML='<tr><td><a href="/student/assessments/practice">Practice</a></td><td>88%</td></tr>';
 await vi.advanceTimersByTimeAsync(2000);const result=await pending;expect(result.tables[0].rows).toHaveLength(1);
});
it('rejects a course heading without course data or an explicit empty state',async()=>{
 vi.useFakeTimers();document.body.innerHTML='<div class="account-menu__trigger">Student Account menu</div><main><h1>Courses</h1></main>';
 const pending=collectCrowdmarkPage(location.pathname,'courses',null);await vi.advanceTimersByTimeAsync(25000);expect(await pending).toEqual({error:'crowdmark-page-incomplete'});
});
it('reuses previous assessment IDs so notes and completion remain associated',()=>{
 const entry=parseCrowdmarkTable({headers:['Title','Score'],rows:[{cells:['Practice','88%'],href:'/student/assessments/practice'}]},'MATH 135','America/Toronto','math-135-fall-2026')[0];
 const previous={...entry,id:'crowdmark:cm:old-api-id'};const overlays={[previous.id]:{note:'Keep this',done:true}};
 const [updated]=retainCrowdmarkIds([entry],[previous]);expect(overlays[updated.id]).toEqual({note:'Keep this',done:true});
 expect(gradeCourseKey(entry)).not.toBe(gradeCourseKey({...entry,readerCourseId:'math-135-winter-2027'}));
});

it('accepts a confirmed empty assessment page even without a course count',async()=>{vi.useFakeTimers();document.body.innerHTML='<main><h1>Course</h1><h2>Assignments</h2><p>No assessments available</p></main>';const p=collectCrowdmarkPage(location.pathname,'assessments',null);await vi.advanceTimersByTimeAsync(700);expect((await p).tables).toEqual([])});
