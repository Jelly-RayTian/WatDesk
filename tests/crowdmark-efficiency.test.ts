import {it,expect,vi,afterEach} from 'vitest';
import {readCrowdmarkPages} from '../src/adapters/crowdmark-dom';
import {emptyState,type Entry} from '../src/domain';
vi.mock('../src/adapters/source-tabs',()=>({withSourceTab:async(_p:any,fn:any,id=42)=>fn(id)}));
vi.mock('../src/core/sync',async original=>({...await original<any>(),waitForTab:async()=>{}}));
afterEach(()=>vi.unstubAllGlobals());
it('saves each course before visiting archive, keeps good grades when another course times out, and uses SPA navigation',async()=>{
 let url='https://app.crowdmark.com/student/courses';const visited:string[]=[];const saved:string[]=[];const hard=vi.fn();
 vi.stubGlobal('chrome',{tabs:{get:async()=>({id:42,url}),update:async(_id:number,o:any)=>{hard(o);url=o.url}},scripting:{executeScript:async({args}:any)=>{const path=args[0];if(args[1]==='navigate'){url='https://app.crowdmark.com'+path;return [{result:true}]};visited.push(path);
 if(path==='/student/courses')return [{result:{links:[{href:'/student/courses/good',count:'1'},{href:'/student/courses/slow',count:'1'}]}}];
 if(path==='/student/course-archive'){expect(saved).toEqual(['90']);return [{result:{links:[]}}]};
 if(path.endsWith('/slow'))throw Error('crowdmark-grades-timeout');
 return [{result:{heading:'MATH 135',zone:'America/Toronto',tables:[{headers:['Title','Score'],rows:[{cells:['A01','90%'],href:'/student/assessments/a01'}]}]}}];
 }}});
 const state=emptyState();state.entries=[{id:'old',platform:'crowdmark',readerCourseId:'slow',url:'https://app.crowdmark.com/student/assessments/old',scorePercent:75}] as Entry[];
 const result=await readCrowdmarkPages(state,undefined,{onCourse:async part=>{saved.push(String(part.entries[0].scorePercent))}});
 expect(result.entries.map(e=>e.scorePercent)).toEqual([90,75]);expect(result.warning).toContain('partial');expect(visited.indexOf('/student/courses/good')).toBeLessThan(visited.indexOf('/student/course-archive'));expect(hard).toHaveBeenCalledTimes(1);
});
it('does not revisit archive during the daily freshness window',async()=>{
 let url='https://app.crowdmark.com/student/courses';const calls:string[]=[];
 vi.stubGlobal('chrome',{tabs:{get:async()=>({id:42,url}),update:async(_id:number,o:any)=>{url=o.url}},scripting:{executeScript:async({args}:any)=>{calls.push(args[0]);return [{result:{links:[]}}]}}});
 const s=emptyState();s.sources.crowdmark={status:'ok',gradesArchiveAt:new Date().toISOString()};await readCrowdmarkPages(s);expect(calls).not.toContain('/student/course-archive');
});
