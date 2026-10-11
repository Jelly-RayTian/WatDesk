import {it,expect,vi,afterEach} from 'vitest';
import {withSourceTab} from '../src/adapters/source-tabs';
import {readCrowdmarkPages} from '../src/adapters/crowdmark-dom';
import {emptyState} from '../src/domain';
afterEach(()=>vi.unstubAllGlobals());
it('acquires a fresh source tab when a page disappears during a read',async()=>{
 let alive=true;const create=vi.fn().mockResolvedValue({id:102});
 vi.stubGlobal('chrome',{tabs:{query:async()=>alive?[{id:101,url:'https://app.crowdmark.com/student/courses'}]:[],get:async()=>{throw Error('No tab with id: 101.')},create}});
 const ids:number[]=[];const result=await withSourceTab('crowdmark',async id=>{ids.push(id);if(id===101){alive=false;throw Error('No tab with id: 101.')}return 'grades'});
 expect(ids).toEqual([101,102]);expect(result).toBe('grades');expect(create).toHaveBeenCalledTimes(1);
});
it('continues the actual history reader after its tab closes in the middle of a course',async()=>{
 const base='https://app.crowdmark.com';const tabs=new Map([[201,{id:201,url:base+'/student/courses',status:'complete'}]]);let closed=false;
 const create=vi.fn(async({url}:any)=>{const tab={id:202,url,status:'complete'};tabs.set(202,tab);return tab});
 vi.stubGlobal('chrome',{tabs:{query:async()=>[...tabs.values()],get:async(id:number)=>{if(!tabs.has(id))throw Error(`No tab with id: ${id}.`);return tabs.get(id)},create,update:async(id:number,opts:any)=>{const tab=tabs.get(id);if(!tab)throw Error(`No tab with id: ${id}.`);Object.assign(tab,opts);return tab}},scripting:{executeScript:async({target,args}:any)=>{
  if(args[0]==='/student/courses')return [{result:{links:[{href:'/student/courses/math-135',name:'MATH 135',count:'1'}]}}];
  if(args[0]==='/student/course-archive')return [{result:{links:[]}}];
  if(!closed){closed=true;tabs.delete(target.tabId);throw Error(`No tab with id: ${target.tabId}.`)}
  return [{result:{heading:'MATH 135',zone:'America/Toronto',tables:[{headers:['Title','Score','Status'],rows:[{cells:['A01','90%','Graded'],href:'/student/assessments/a01'}]}]}}];
 }}});
 const result=await readCrowdmarkPages(emptyState());expect(result.entries[0].scorePercent).toBe(90);expect(create).toHaveBeenCalledTimes(1);expect(tabs.get(202)?.url).toBe(base+'/student/courses');
});
it('does not reopen pages for network errors or retry a permanently disappearing tab forever',async()=>{
 const query=vi.fn().mockResolvedValue([{id:103,url:'https://app.crowdmark.com/student/courses'}]);vi.stubGlobal('chrome',{tabs:{query}});
 await expect(withSourceTab('crowdmark',async()=>{throw Error('network')})).rejects.toThrow('network');expect(query).toHaveBeenCalledTimes(1);
 query.mockClear();await expect(withSourceTab('crowdmark',async()=>{throw Error('No tab with id: 103.')})).rejects.toThrow('No tab');expect(query).toHaveBeenCalledTimes(3);
});
