import {it,expect,vi} from 'vitest';
import {sourceTab} from '../src/adapters/source-tabs';
it('coalesces concurrent attempts to open the same source into one canonical page',async()=>{
 const create=vi.fn().mockResolvedValue({id:7});vi.stubGlobal('chrome',{tabs:{query:async()=>[],create}});
 expect(await Promise.all([sourceTab('crowdmark'),sourceTab('crowdmark')])).toEqual([7,7]);expect(create).toHaveBeenCalledTimes(1);expect(create).toHaveBeenCalledWith({url:'https://app.crowdmark.com/student/courses',active:false});vi.unstubAllGlobals();
});
it('reuses an existing source page without creating or navigating it during sync',async()=>{
 const create=vi.fn(),update=vi.fn();vi.stubGlobal('chrome',{tabs:{query:async()=>[{id:8,url:'https://app.crowdmark.com/student/courses',active:true}],create,update}});
 expect(await sourceTab('crowdmark')).toBe(8);expect(create).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();vi.unstubAllGlobals();
});
it('the Open button reuses a course tab and returns it to the correct landing URL',async()=>{
 const update=vi.fn().mockResolvedValue({});vi.stubGlobal('chrome',{tabs:{query:async()=>[{id:9,url:'https://app.crowdmark.com/student/course-archive'}],get:async()=>({id:9,url:'https://app.crowdmark.com/student/course-archive',windowId:1}),update},windows:{update:async()=>{}}});
 await sourceTab('crowdmark',true);expect(update).toHaveBeenCalledWith(9,{active:true,url:'https://app.crowdmark.com/student/courses'});vi.unstubAllGlobals();
});
it('the CS135 Open button opens View Submissions rather than the public course home',async()=>{
 const create=vi.fn().mockResolvedValue({id:17}),update=vi.fn().mockResolvedValue({});vi.stubGlobal('chrome',{tabs:{query:async()=>[],create,get:async()=>({id:17,url:'https://student.cs.uwaterloo.ca/~cs135/assign/viewsubmissions/index.html'}),update}});
 await sourceTab('cs135',true);expect(create).toHaveBeenCalledWith({url:'https://student.cs.uwaterloo.ca/~cs135/assign/viewsubmissions/index.html',active:false});expect(update).toHaveBeenCalledWith(17,{active:true});vi.unstubAllGlobals();
});
