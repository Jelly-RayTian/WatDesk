import {it,expect,vi,afterEach} from 'vitest';
import {emptyState} from '../src/domain';
const source=vi.hoisted(()=>({current:null as any}));
vi.mock('../src/vendor/watnow/data/live-source.js',()=>({LiveSource:class{constructor(){return source.current}}}));
vi.mock('../src/adapters/source-tabs',()=>({sourceTab:async()=>1}));
import {readPlatform} from '../src/adapters/read';
afterEach(()=>vi.unstubAllGlobals());
function setup(){
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true}});
 source.current={versions:{le:'1.82'},checkSession:async()=>({signedIn:true}),listCourses:async()=>[{id:'1',orgUnitId:1,code:'MATH 135'}],ensureFeed:async()=>{},ensureCalendar:async()=>{},listDeadlines:async()=>[],calendar:{events:[]},readOk:new Map([['1',new Set(['dropbox','quizzes','feed','calendar'])]]),report:{courses:[{code:'MATH 135',tools:{dropbox:0,quizzes:0,discussions:'failed: forbidden',myItems:0,calendar:0}}]},paged:vi.fn().mockRejectedValue(Object.assign(Error('denied'),{code:'forbidden',status:403}))};
 const s=emptyState();s.entries=[{id:'learn:grade:old',platform:'learn',course:'MATH 135',readerCourseId:'1',title:'Old score',type:'task',start:null,end:null,due:null,status:'open',url:'',gradeOnly:true,scorePercent:80}];return s;
}
it('keeps saved grades, reports restricted tools softly, and caches their checked availability',async()=>{
 const s=setup(),r=await readPlatform('learn',s);expect(r.warning).toBeUndefined();expect(r.entries).toEqual(s.entries);expect(r.issues).toHaveLength(2);expect(r.gradesAt).toBeTruthy();
 s.sources.learn={status:'ok',gradesAt:r.gradesAt,issues:r.issues};source.current.paged.mockClear();const cached=await readPlatform('learn',s);expect(source.current.paged).not.toHaveBeenCalled();expect(cached.issues).toEqual(r.issues);
 await readPlatform('learn',s,true);expect(source.current.paged).toHaveBeenCalledTimes(1);
});
it('shows a real transient grade failure with course and status, preserving the grade',async()=>{
 const s=setup();source.current.paged.mockRejectedValue(Object.assign(Error('server'),{code:'http',status:503}));const r=await readPlatform('learn',s);expect(r.warning).toContain('MATH 135/grades/503');expect(r.gradesAt).toBeUndefined();expect(r.entries).toEqual(s.entries);
});
it('coursework session expiration reaches the sign-in recovery path',async()=>{
 const s=setup();source.current.listDeadlines=async()=>{throw Object.assign(Error('expired'),{code:'signed-out',status:401})};await expect(readPlatform('learn',s)).rejects.toThrow('signed-out');
});
