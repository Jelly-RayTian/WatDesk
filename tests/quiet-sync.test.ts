import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
const readers=vi.hoisted(()=>({read:vi.fn(),login:vi.fn(),grades:vi.fn()}));
vi.mock('../src/adapters/read',()=>({readPlatform:readers.read}));
vi.mock('../src/adapters/login',()=>({autoLogin:readers.login}));
vi.mock('../src/adapters/crowdmark-api',()=>({enrichCrowdmarkGrades:readers.grades}));
vi.mock('../src/background/school-login',()=>({configureSchoolLogin:async()=>{}}));
beforeEach(()=>{vi.resetModules();readers.read.mockReset().mockResolvedValue({entries:[],courses:[]});readers.login.mockReset();readers.grades.mockReset().mockResolvedValue({entries:[],courses:[]})});
afterEach(()=>vi.unstubAllGlobals());
async function setup(tabs:any[]=[],onboardingComplete=true){
 let state=emptyState();state.settings.onboardingComplete=onboardingComplete;
 let message:any,alarm:any,updated:any;
 const effects={create:vi.fn(async(props:any)=>({id:99,status:'complete',...props})),update:vi.fn().mockResolvedValue({}),reload:vi.fn(),focus:vi.fn()};
 vi.stubGlobal('chrome',{
  storage:{local:{get:async()=>({watdesk:structuredClone(state)}),set:async(data:any)=>{state=data.watdesk}}},
  tabs:{query:async({url}:any)=>tabs.filter(t=>t.url.startsWith(url.replace('*',''))),get:async(id:number)=>{const tab=tabs.find(t=>t.id===id);if(!tab&&id!==99)throw Error('No tab with id');return tab||{id:99,status:'complete'}},create:effects.create,update:effects.update,reload:effects.reload,onUpdated:{addListener:(fn:any)=>{updated=fn}}},
  windows:{update:effects.focus},permissions:{contains:async()=>true},notifications:{create:async()=>''},
  runtime:{id:'test',onMessage:{addListener:(fn:any)=>{message=fn}},onInstalled:{addListener:()=>{}},onStartup:{addListener:()=>{}}},
  alarms:{onAlarm:{addListener:(fn:any)=>{alarm=fn}}}
 });
 await import('../src/background/worker');
 const send=(type:string,extra:object={})=>new Promise<any>(resolve=>message({type,...extra},{id:'test'},resolve));
 await send('state');
 const settle=async()=>vi.waitFor(()=>expect(state.syncRun?.finished).toBe(true));
 return {state:()=>state,send,settle,alarm:()=>alarm({name:'sync'}),updated,effects,tabs};
}
it('the timer leaves closed platforms closed and preserves saved data even during unfinished setup',async()=>{
 const ctx=await setup([],false);ctx.state().entries=[{id:'manual:exam',platform:'manual',course:'CS 135',title:'Final',type:'exam',start:'2026-12-15T00:30:00Z',end:null,due:null,status:'open',url:''}];
 ctx.alarm();await ctx.settle();
 expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.focus).not.toHaveBeenCalled();expect(readers.read).not.toHaveBeenCalled();expect(ctx.state().entries[0].title).toBe('Final');
});
it('opening a returning user workspace does not create tabs or wake discarded pages',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',discarded:true,status:'complete'}]);
 await ctx.send('refreshOnOpen');await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.reload).not.toHaveBeenCalled();expect(readers.read).not.toHaveBeenCalled();
});
it('passive reads save new data using existing tabs without login, navigation or grade browsing',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'},{id:2,url:'https://app.crowdmark.com/student/courses',status:'complete'},{id:3,url:'https://odyssey.uwaterloo.ca/teaching/schedule',status:'complete'}]);
 const fresh:Entry={id:'learn:new',platform:'learn',course:'CS 135',title:'New assignment',type:'task',start:null,end:null,due:'2026-10-20T01:00:00Z',status:'open',url:''};
 readers.read.mockImplementation(async(p:string)=>({entries:p==='learn'?[fresh]:[],courses:[]}));
 ctx.alarm();await ctx.settle();expect(ctx.state().entries).toContainEqual(expect.objectContaining({title:'New assignment'}));
 expect(readers.login).not.toHaveBeenCalled();expect(readers.grades).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.create).not.toHaveBeenCalled();
 expect(readers.read).toHaveBeenCalledWith('learn',expect.anything(),false,1);
});
it('an expired session during passive refresh keeps previous data without navigating to sign-in',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'}]);ctx.state().sources.learn={status:'ok',at:'2026-10-10T12:00:00Z'};
 readers.read.mockRejectedValue(Error('signed-out'));ctx.alarm();await ctx.settle();expect(ctx.state().sources.learn).toMatchObject({status:'error',at:'2026-10-10T12:00:00Z',error:'signed-out'});expect(ctx.effects.update).not.toHaveBeenCalled();expect(readers.login).not.toHaveBeenCalled();
});
it('returning from Learn sign-in retries only Learn without opening other platforms',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'}]);ctx.state().sources.learn={status:'error',error:'sign-in-required'};
 ctx.updated(1,{status:'complete'},{url:'https://learn.uwaterloo.ca/d2l/home'});await vi.waitFor(()=>expect(ctx.state().sources.learn.status).toBe('ok'));
 expect(readers.read.mock.calls.map(c=>c[0])).toEqual(['learn']);expect(ctx.effects.create).not.toHaveBeenCalled();expect(readers.login).not.toHaveBeenCalled();
});
it('explicit Refresh can still open missing source pages and read fresh data',async()=>{
 const ctx=await setup();await ctx.send('refreshOnOpen',{force:true});await ctx.settle();expect(ctx.effects.create).toHaveBeenCalledTimes(3);expect(ctx.state().syncRun?.completed).toEqual(expect.arrayContaining(['learn','crowdmark','odyssey']));
});

it('manual Refresh queued during passive reading still performs the requested full refresh',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'}]);
 let release!:(value:any)=>void;
 readers.read.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve})).mockResolvedValue({entries:[],courses:[]});
 ctx.alarm();await vi.waitFor(()=>expect(readers.read).toHaveBeenCalledTimes(1));
 await ctx.send('refreshOnOpen',{force:true});release({entries:[],courses:[]});
 await vi.waitFor(()=>expect(ctx.state().syncRun?.completed).toHaveLength(3));
 expect(ctx.effects.create).toHaveBeenCalledTimes(2);expect(readers.read.mock.calls.some(c=>c[0]==='learn'&&c[2]===true)).toBe(true);
});
it('automatic public CS135 refresh never acquires a source tab',async()=>{
 const ctx=await setup();ctx.state().settings.cs135Enabled=true;
 ctx.alarm();await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.state().sources.cs135.status).toBe('ok');
 expect(readers.read.mock.calls.map(c=>c[0])).toEqual(['cs135']);
});
