import {it,expect,vi} from 'vitest';
import {emptyState} from '../src/domain';
vi.mock('../src/adapters/source-tabs',()=>({sourceTab:async()=>42,withSourceTab:async(_p:any,fn:any,id=42)=>fn(id)}));
vi.mock('../src/core/sync',async original=>({...await original<any>(),waitForTab:async()=>{}}));
import {readCrowdmarkPages} from '../src/adapters/crowdmark-dom';
const base='https://app.crowdmark.com';
function browser(fail=false,userMoved=false){
 let url=base+'/student/courses';const create=vi.fn(),remove=vi.fn();
 const update=vi.fn(async(_id:number,options:any)=>{url=options.url;return {id:42,url}});
 vi.stubGlobal('chrome',{tabs:{get:async()=>({id:42,url}),create,remove,update},scripting:{executeScript:async({args}:any)=>{
  if(args[0]==='/student/course-archive')return [{result:{links:[]}}];
  if(args[0]==='/student/courses')return [{result:{links:[{href:'/student/courses/math-135-fall-2026',name:'MATH 135',count:'1'}]}}];
  if(fail){if(userMoved)url=base+'/student/courses/other-course';throw Error('network')}
  return [{result:{heading:'MATH 135 Fall 2026',zone:'America/Toronto',tables:[{headers:['Title','Score','Status'],rows:[{cells:['A01','90%','Graded'],href:'/student/assessments/a01'}]}]}}];
 }}});return {create,remove,update,url:()=>url};
}
it('reads history using the existing Crowdmark tab and restores its original page',async()=>{
 const b=browser();const result=await readCrowdmarkPages(emptyState());expect(result.entries[0].scorePercent).toBe(90);expect(b.create).not.toHaveBeenCalled();expect(b.remove).not.toHaveBeenCalled();expect(b.url()).toBe(base+'/student/courses');vi.unstubAllGlobals();
});
it('restores the original Crowdmark page even when a grade read fails',async()=>{
 const b=browser(true);await expect(readCrowdmarkPages(emptyState())).rejects.toThrow('network');expect(b.url()).toBe(base+'/student/courses');vi.unstubAllGlobals();
});
it('does not overwrite a page the user navigated to during reading',async()=>{
 const b=browser(true,true);await expect(readCrowdmarkPages(emptyState())).rejects.toThrow('network');expect(b.url()).toBe(base+'/student/courses/other-course');vi.unstubAllGlobals();
});
