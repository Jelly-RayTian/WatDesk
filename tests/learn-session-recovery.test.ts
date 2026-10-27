import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {emptyState} from '../src/domain';
import {readPlatform} from '../src/adapters/read';
const session=vi.hoisted(()=>({check:vi.fn(),login:vi.fn()}));
vi.mock('../src/adapters/login',()=>({autoLogin:session.login}));
vi.mock('../src/vendor/watnow/data/live-source.js',()=>({LiveSource:class{report={courses:[]};calendar={events:[]};readOk=new Set();checkSession=session.check;listCourses=async()=>[]}}));
beforeEach(()=>{session.check.mockReset();session.login.mockReset().mockResolvedValue(undefined)});
afterEach(()=>vi.unstubAllGlobals());
it('renews an unreadable Learn worker session in its own inactive page and reads again',async()=>{
 const create=vi.fn().mockResolvedValue({id:42}),remove=vi.fn().mockResolvedValue(undefined),update=vi.fn();
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create,remove,update}});
 session.check.mockResolvedValueOnce({signedIn:false,reason:'no-tab'}).mockResolvedValueOnce({signedIn:true,student:{name:'student'}});
 const state=emptyState();state.sources.learn={status:'ok',gradesAt:new Date().toISOString()};
 const result=await readPlatform('learn',state);
 expect(result.identity).toBe('student');expect(create).toHaveBeenCalledWith({url:'https://learn.uwaterloo.ca/d2l/home',active:false});expect(remove).toHaveBeenCalledExactlyOnceWith(42);expect(update).not.toHaveBeenCalled();
});
it('does not open a Learn page for a network failure',async()=>{
 const create=vi.fn();vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create}});session.check.mockResolvedValue({signedIn:false,reason:'unreachable'});
 await expect(readPlatform('learn',emptyState())).rejects.toThrow('unreachable');expect(create).not.toHaveBeenCalled();
});

it('closes the recovery page and retains a real sign-in-required error',async()=>{
 const remove=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create:async()=>({id:43}),remove}});
 session.check.mockResolvedValue({signedIn:false,reason:'signed-out'});session.login.mockRejectedValue(Error('sign-in-required'));
 await expect(readPlatform('learn',emptyState())).rejects.toThrow('sign-in-required');expect(remove).toHaveBeenCalledExactlyOnceWith(43);
});
it('cancelling Learn recovery closes its page and prevents the second session read',async()=>{
 const remove=vi.fn().mockResolvedValue(undefined),controller=new AbortController();vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create:async()=>({id:44}),remove}});
 session.check.mockResolvedValue({signedIn:false,reason:'no-tab'});let release!:()=>void;session.login.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve}));
 const run=readPlatform('learn',emptyState(),false,undefined,controller.signal).then(()=> 'ready',e=>e.message);
 await vi.waitFor(()=>expect(session.login).toHaveBeenCalled());controller.abort();expect(await run).toBe('sync-cancelled');expect(remove).toHaveBeenCalledWith(44);release();await new Promise(r=>setTimeout(r,0));expect(session.check).toHaveBeenCalledTimes(1);
});
