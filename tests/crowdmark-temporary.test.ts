import {afterEach,it,expect,vi} from 'vitest';
import {enrichCrowdmarkGrades} from '../src/adapters/crowdmark-api';
import {emptyState} from '../src/domain';
afterEach(()=>vi.unstubAllGlobals());
it('checks every current course in one inactive owned tab and then closes it, preserving user pages',async()=>{
 const base='https://app.crowdmark.com';const tabs=new Map([[1,{id:1,url:base+'/student/courses',status:'complete',active:true}]]);const update=vi.fn(async(id:number,patch:any)=>{Object.assign(tabs.get(id)!,patch);return tabs.get(id)});const create=vi.fn(async(props:any)=>{const tab={id:2,status:'complete',...props};tabs.set(2,tab);return tab});const remove=vi.fn(async(id:number)=>{tabs.delete(id)});const focus=vi.fn();
 vi.stubGlobal('chrome',{tabs:{create,remove,update,get:async(id:number)=>tabs.get(id),query:async()=>[...tabs.values()]},windows:{update:focus},scripting:{executeScript:async({target,args}:any)=>{
  expect(target.tabId).toBe(2);const [path,kind]=args;if(kind==='navigate')return [{result:false}];
  if(kind==='courses')return [{result:{identity:'student',links:path.endsWith('course-archive')?[]:[{href:'/student/courses/math-135',name:'MATH 135',count:'1'},{href:'/student/courses/math-137',name:'MATH 137',count:'1'}]}}];
  const course=path.endsWith('135')?'MATH 135':'MATH 137';return [{result:{identity:'student',heading:course,zone:'America/Toronto',tables:[{headers:['Title','Score','Status'],rows:[{cells:['A01','18 / 20','Graded'],href:'/student/assessments/'+course.replace(' ','-')}]}]}}];
 }}});
 const result=await enrichCrowdmarkGrades(emptyState(),{temporary:true});expect(result.entries).toHaveLength(2);expect(result.entries.every(e=>e.scorePercent===90)).toBe(true);expect(create).toHaveBeenCalledExactlyOnceWith({url:base+'/student/courses',active:false});expect(remove).toHaveBeenCalledExactlyOnceWith(2);expect(tabs.get(1)?.url).toBe(base+'/student/courses');expect(update.mock.calls.every(c=>c[0]===2&&c[1].active!==true)).toBe(true);expect(focus).not.toHaveBeenCalled();
});
