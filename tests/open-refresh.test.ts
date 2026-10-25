vi.mock('../src/background/school-login',()=>({configureSchoolLogin:async()=>{}}));
import {it,expect,vi,beforeEach} from 'vitest';
import {emptyState} from '../src/domain';
const mocked=vi.hoisted(()=>({read:vi.fn(),tab:vi.fn().mockResolvedValue(1),grades:vi.fn()}));
vi.mock('../src/adapters/login',()=>({autoLogin:async()=>{}}));
vi.mock('../src/adapters/read',()=>({readPlatform:mocked.read}));
vi.mock('../src/adapters/source-tabs',()=>({sourceTab:mocked.tab,existingSourceTab:async()=>1}));
vi.mock('../src/adapters/crowdmark-api',()=>({enrichCrowdmarkGrades:mocked.grades}));
vi.mock('../src/core/sync',async original=>({...await original<any>(),waitForTab:async()=>{}}));
beforeEach(()=>{vi.resetModules();mocked.read.mockReset();mocked.tab.mockClear();mocked.grades.mockReset().mockResolvedValue({entries:[],courses:[]})});
async function setup(all=false){
 let tabListener:any;let state=emptyState();state.settings.cs135Enabled=true;state.sources.cs135={status:'syncing'};let listener:any;
 vi.stubGlobal('chrome',{storage:{local:{get:async()=>({watdesk:structuredClone(state)}),set:async(value:any)=>{state=value.watdesk}}},tabs:{update:vi.fn().mockResolvedValue({}),onUpdated:{addListener:(fn:any)=>{tabListener=fn}}},notifications:{create:vi.fn().mockResolvedValue('notification')},permissions:{contains:async({origins}:any)=>all||origins[0].includes('student.cs.')},runtime:{id:'test',onMessage:{addListener:(fn:any)=>{listener=fn}},onInstalled:{addListener:()=>{}},onStartup:{addListener:()=>{}}},alarms:{onAlarm:{addListener:()=>{}}}});
 await import('../src/background/worker');
 const rawMessage=(type:string,extra:object={})=>new Promise<any>(resolve=>listener({type,...extra},{id:'test'},resolve));
 await rawMessage('state');
 return {updated:(...args:any[])=>tabListener(...args),state:()=>state,rawMessage,message:async(type:string,extra:object={})=>{const before=state.syncRun;const result=await rawMessage(type,extra);if(type==='refreshOnOpen')await vi.waitFor(()=>{expect(state.syncRun).not.toBe(before);expect(state.syncRun?.finished).toBe(true)});return result}};
}
it('coalesces duplicate openings while waiting for the real read to finish',async()=>{
 const ctx=await setup();expect((await ctx.message('state')).value.sources.cs135.error).toBe('sync-interrupted');
 let release:any;mocked.read.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve}));
 let finished=false;const first=ctx.message('refreshOnOpen').then(v=>{finished=true;return v});
 await vi.waitFor(()=>expect(mocked.read).toHaveBeenCalledTimes(1));
 const second=ctx.message('refreshOnOpen');expect(finished).toBe(false);release({entries:[],courses:[]});
 await Promise.all([first,second]);expect(finished).toBe(true);expect(ctx.state().sources.cs135.status).toBe('ok');expect(mocked.read).toHaveBeenCalledTimes(1);vi.unstubAllGlobals();
});
it('reads platforms concurrently and saves a quick result while others are pending',async()=>{
 const ctx=await setup(true);const releases=new Map<string,()=>void>();
 mocked.read.mockImplementation(p=>new Promise(resolve=>releases.set(p,()=>resolve({entries:[],courses:[]}))));
 const run=ctx.message('refreshOnOpen');
 await vi.waitFor(()=>expect(releases.size).toBe(4));
 releases.get('odyssey')!();await vi.waitFor(()=>expect(ctx.state().syncRun?.completed).toContain('odyssey'));
 expect(ctx.state().syncRun?.finished).toBe(false);expect(ctx.state().sources.learn.status).toBe('syncing');
 for(const p of ['learn','crowdmark','cs135'])releases.get(p)!();
 await run;expect(new Set(ctx.state().syncRun?.completed)).toEqual(new Set(['learn','crowdmark','odyssey','cs135']));vi.unstubAllGlobals();
});
it('a failed platform does not stop other sources from completing',async()=>{
 const ctx=await setup(true);mocked.read.mockImplementation(async p=>{if(p==='crowdmark')throw Error('signed-out');return {entries:[],courses:[]}});
 await ctx.message('refreshOnOpen');expect(ctx.state().syncRun?.completed).toEqual(expect.arrayContaining(['learn','odyssey','cs135']));
 expect(ctx.state().syncRun).toMatchObject({failed:'crowdmark',finished:true});expect(ctx.state().sources.crowdmark.error).toBe('signed-out');vi.unstubAllGlobals();
});

it('uses temporary grade pages on automatic and manual refresh',async()=>{
 const ctx=await setup(true);ctx.state().sources.crowdmark={status:'ok',gradesAt:new Date().toISOString()};mocked.read.mockResolvedValue({entries:[],courses:[]});
 await ctx.message('refreshOnOpen');expect(mocked.grades).toHaveBeenCalledTimes(1);expect(mocked.grades).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({temporary:true}));await ctx.message('refreshOnOpen',{force:true});expect(mocked.grades).toHaveBeenCalledTimes(2);vi.unstubAllGlobals();
});

it('reuses recent successful results without opening source pages and manual refresh bypasses cache',async()=>{
 const ctx=await setup(true);for(const p of ['learn','crowdmark','odyssey','cs135'])ctx.state().sources[p]={status:'ok',at:new Date().toISOString()};mocked.read.mockResolvedValue({entries:[],courses:[]});
 await ctx.message('refreshOnOpen');expect(mocked.read).not.toHaveBeenCalled();expect(mocked.tab).not.toHaveBeenCalled();expect(ctx.state().syncRun?.reused).toEqual(['learn','crowdmark','odyssey','cs135']);
 await ctx.message('refreshOnOpen',{force:true});expect(mocked.read).toHaveBeenCalledTimes(4);expect(ctx.state().sources.learn.durationMs).toBeTypeOf('number');expect(ctx.state().sources.learn.phase).toBeUndefined();vi.unstubAllGlobals();
});
it('an individual retry reads only that platform and keeps the last successful data on failure',async()=>{
 const ctx=await setup(true);ctx.state().sources.learn={status:'ok',at:'2026-10-10T12:00:00Z'};mocked.read.mockRejectedValue(Error('signed-out'));
 await ctx.message('sync',{platform:'learn'});await vi.waitFor(()=>expect(ctx.state().sources.learn.status).toBe('error'));await vi.waitFor(()=>expect(ctx.state().sources.learn.phase).toBeUndefined());expect(ctx.state().sources.learn.at).toBe('2026-10-10T12:00:00Z');expect(mocked.read.mock.calls.map(c=>c[0])).toEqual(['learn']);vi.unstubAllGlobals();
});

it('acknowledges background refresh immediately and skips CS135 unless selected',async()=>{
 const ctx=await setup(true);ctx.state().settings.cs135Enabled=false;let release:any;mocked.read.mockImplementationOnce(()=>new Promise(r=>{release=r})).mockResolvedValue({entries:[],courses:[]});
 const reply=await ctx.rawMessage('refreshOnOpen');expect(reply.ok).toBe(true);await vi.waitFor(()=>expect(mocked.read).toHaveBeenCalledTimes(3));expect(ctx.state().syncRun?.finished).toBe(false);release({entries:[],courses:[]});await vi.waitFor(()=>expect(ctx.state().syncRun?.finished).toBe(true));expect(mocked.read.mock.calls.map(c=>c[0])).toEqual(['learn','crowdmark','odyssey']);vi.unstubAllGlobals();
});

it('reports an expired session without opening or retrying the login page',async()=>{
 const ctx=await setup(true);mocked.read.mockRejectedValue(Error('signed-out'));
 await ctx.message('sync',{platform:'learn'});await vi.waitFor(()=>expect(ctx.state().sources.learn.status).toBe('error'));expect(chrome.tabs.update).not.toHaveBeenCalled();expect(mocked.read).toHaveBeenCalledTimes(1);vi.unstubAllGlobals();
});

it('sends an exam-change notification after sync and records it so it is not repeated',async()=>{
 const ctx=await setup(true);const exam={id:'odyssey:x',platform:'odyssey' as const,course:'MATH 135',title:'Midterm',type:'exam' as const,start:'2099-10-20T00:00:00Z',end:'2099-10-20T02:00:00Z',due:null,status:'open' as const,location:'MC',seat:'1',url:''};ctx.state().entries=[exam];mocked.read.mockResolvedValue({entries:[{...exam,location:'DC',seat:'2'}],courses:[]});
 await ctx.message('sync',{platform:'odyssey'});await vi.waitFor(()=>expect(chrome.notifications.create).toHaveBeenCalledTimes(1));await vi.waitFor(()=>expect(Object.keys(ctx.state().sent)).toHaveLength(1));await ctx.message('sync',{platform:'odyssey'});await vi.waitFor(()=>expect(mocked.read).toHaveBeenCalledTimes(2));expect(chrome.notifications.create).toHaveBeenCalledTimes(1);vi.unstubAllGlobals();
});

it('resumes a failed sign-in automatically when the platform landing page completes loading',async()=>{
 const ctx=await setup(true);ctx.state().sources.learn={status:'error',error:'sign-in-required'};mocked.read.mockResolvedValue({entries:[],courses:[]});ctx.updated(1,{status:'complete'},{url:'https://learn.uwaterloo.ca/d2l/home'});await vi.waitFor(()=>expect(ctx.state().sources.learn.status).toBe('ok'));expect(mocked.read.mock.calls.map(c=>c[0])).toEqual(['learn']);vi.unstubAllGlobals();
});
it('disabling CS135 clears an interrupted in-progress marker',async()=>{
 const ctx=await setup(true);ctx.state().sources.cs135={status:'syncing',phase:'tasks'};await ctx.message('settings',{patch:{cs135Enabled:false}});expect(ctx.state().sources.cs135.phase).toBeUndefined();expect(ctx.state().sources.cs135.status).toBe('idle');vi.unstubAllGlobals();
});

it('first setup and later manual refresh never acquire source tabs',async()=>{const ctx=await setup(true);mocked.read.mockResolvedValue({entries:[],courses:[]});await ctx.message('refreshOnOpen');expect(mocked.tab).not.toHaveBeenCalled();ctx.state().settings.onboardingComplete=true;await ctx.message('refreshOnOpen',{force:true});expect(mocked.tab).not.toHaveBeenCalled();vi.unstubAllGlobals()});
