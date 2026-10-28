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
  alarms:{get:async()=>({periodInMinutes:360}),create:async()=>{},clear:async()=>true,onAlarm:{addListener:(fn:any)=>{alarm=fn}}}
 });
 await import('../src/background/worker');
 const send=(type:string,extra:object={})=>new Promise<any>(resolve=>message({type,...extra},{id:'test'},resolve));
 await send('state');
 const settle=async()=>vi.waitFor(()=>expect(state.syncRun?.finished).toBe(true));
 return {sendExtensionPage:(url='chrome-extension://test/index.html')=>{const respond=vi.fn();message({type:'state'},{id:'test',tab:{id:99},url},respond);return respond},state:()=>state,send,settle,alarm:()=>alarm({name:'sync'}),updated,effects,tabs};
}
it('the timer leaves closed platforms closed and preserves saved data even during unfinished setup',async()=>{
 const ctx=await setup([],false);ctx.state().entries=[{id:'manual:exam',platform:'manual',course:'CS 135',title:'Final',type:'exam',start:'2026-12-15T00:30:00Z',end:null,due:null,status:'open',url:''}];
 ctx.alarm();await ctx.settle();
 expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.focus).not.toHaveBeenCalled();expect(readers.read).toHaveBeenCalledTimes(3);expect(ctx.state().entries[0].title).toBe('Final');
});
it('opening a returning user workspace does not create tabs or wake discarded pages',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',discarded:true,status:'complete'}]);
 await ctx.send('refreshOnOpen');await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.reload).not.toHaveBeenCalled();expect(readers.read).toHaveBeenCalledTimes(3);
});
it('passive reads save data and check grades without login or disturbing user tabs',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'},{id:2,url:'https://app.crowdmark.com/student/courses',status:'complete'},{id:3,url:'https://odyssey.uwaterloo.ca/teaching/schedule',status:'complete'}]);
 const fresh:Entry={id:'learn:new',platform:'learn',course:'CS 135',title:'New assignment',type:'task',start:null,end:null,due:'2026-10-20T01:00:00Z',status:'open',url:''};
 readers.read.mockImplementation(async(p:string)=>({entries:p==='learn'?[fresh]:[],courses:[]}));
 ctx.alarm();await ctx.settle();expect(ctx.state().entries).toContainEqual(expect.objectContaining({title:'New assignment'}));
 expect(readers.login).not.toHaveBeenCalled();expect(readers.grades).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({temporary:true}));expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.create).not.toHaveBeenCalled();
 expect(readers.read).toHaveBeenCalledWith('learn',expect.anything(),false,1,expect.any(AbortSignal));
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
it('explicit Refresh reads fresh data without opening missing source pages',async()=>{
 const ctx=await setup();await ctx.send('refreshOnOpen',{force:true});await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.state().syncRun?.completed).toEqual(expect.arrayContaining(['learn','crowdmark','odyssey']));
});

it('manual Refresh queued during passive reading still performs the requested full refresh',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete'}]);
 let release!:(value:any)=>void;
 readers.read.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve})).mockResolvedValue({entries:[],courses:[]});
 ctx.alarm();await vi.waitFor(()=>expect(readers.read).toHaveBeenCalledTimes(3));
 await ctx.send('refreshOnOpen',{force:true});release({entries:[],courses:[]});
 await vi.waitFor(()=>expect(ctx.state().syncRun?.completed).toHaveLength(3));
 expect(ctx.effects.create).not.toHaveBeenCalled();expect(readers.read.mock.calls.some(c=>c[0]==='learn'&&c[2]===true)).toBe(true);
});
it('automatic public CS135 refresh never acquires a source tab',async()=>{
 const ctx=await setup();ctx.state().settings.cs135Enabled=true;
 ctx.alarm();await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.state().sources.cs135.status).toBe('ok');
 expect(readers.read.mock.calls.map(c=>c[0])).toEqual(['learn','crowdmark','odyssey','cs135']);
});
it('Möbius is optional and manual refresh never launches an absent LTI page',async()=>{
 const ctx=await setup();await ctx.send('sync',{platform:'mobius'});await new Promise(r=>setTimeout(r,10));expect(readers.read).not.toHaveBeenCalled();
 ctx.state().settings.mobiusEnabled=true;await ctx.send('sync',{platform:'mobius'});await vi.waitFor(()=>expect(ctx.state().sources.mobius?.status).toBe('error'));
 expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();expect(readers.login).not.toHaveBeenCalled();
});
it('reading a user-opened Möbius page never navigates even on manual refresh',async()=>{
 const ctx=await setup([{id:7,url:'https://uwmo.mobius.cloud/lti/advantage',status:'complete'}]);ctx.state().settings.mobiusEnabled=true;
 await ctx.send('sync',{platform:'mobius'});await vi.waitFor(()=>expect(ctx.state().sources.mobius?.status).toBe('ok'));
 expect(readers.read).toHaveBeenCalledWith('mobius',expect.anything(),true,7);expect(readers.login).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();
});

it('accepts state requests from the extension full-page tab, while content pages remain isolated',async()=>{
 const ctx=await setup();const respond=ctx.sendExtensionPage();await vi.waitFor(()=>expect(respond).toHaveBeenCalledWith(expect.objectContaining({ok:true,value:expect.objectContaining({schemaVersion:1})})));expect(ctx.sendExtensionPage('https://learn.uwaterloo.ca/d2l/home')).not.toHaveBeenCalled();
});
it('passive refresh uses background reads without waking frozen pages',async()=>{
 const ctx=await setup([{id:1,url:'https://learn.uwaterloo.ca/d2l/home',status:'complete',frozen:true}]);ctx.alarm();await ctx.settle();expect(readers.read).toHaveBeenCalledTimes(3);expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.reload).not.toHaveBeenCalled();
});
it('manual CS135 refresh never opens the submission page',async()=>{
 const ctx=await setup();ctx.state().settings.cs135Enabled=true;await ctx.send('sync',{platform:'cs135'});await vi.waitFor(()=>expect(ctx.state().sources.cs135?.status).toBe('ok'));expect(ctx.effects.create).not.toHaveBeenCalled();expect(readers.read.mock.calls[0][0]).toBe('cs135');
});
it('a timed-out read cannot overwrite the error with a late response',async()=>{
 vi.useFakeTimers();try{
  const ctx=await setup();let release!:(value:any)=>void;readers.read.mockImplementation((p:string)=>p==='learn'?new Promise(resolve=>{release=resolve}):Promise.resolve({entries:[],courses:[]}));
  await ctx.send('refreshOnOpen',{force:true});await vi.advanceTimersByTimeAsync(1);expect(ctx.state().sources.learn.phase).toBe('tasks');
  await vi.advanceTimersByTimeAsync(180001);expect(ctx.state().sources.learn).toMatchObject({status:'error',error:'sync-timeout',phase:undefined});
  release({entries:[],courses:[]});await vi.advanceTimersByTimeAsync(1);expect(ctx.state().sources.learn.status).toBe('error');expect(ctx.effects.create).not.toHaveBeenCalled();
 }finally{vi.useRealTimers()}
});
it('an actual expired session stays an error after the background session check, without disturbing user tabs',async()=>{const ctx=await setup();readers.read.mockRejectedValue(Error('signed-out'));readers.grades.mockRejectedValue(Error('sign-in-required'));await ctx.send('refreshOnOpen',{force:true});await ctx.settle();expect(ctx.effects.create).not.toHaveBeenCalled();expect(ctx.effects.update).not.toHaveBeenCalled();expect(ctx.effects.focus).not.toHaveBeenCalled();expect(readers.login).not.toHaveBeenCalled();expect(readers.grades).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({temporary:true,signIn:true}));expect(ctx.state().sources.learn.error).toBe('signed-out')});
it('scheduled sync still runs when the last result is just under six hours old',async()=>{const ctx=await setup();for(const p of ['learn','crowdmark','odyssey'])ctx.state().sources[p]={status:'ok',at:new Date(Date.now()-359*60000).toISOString()};ctx.alarm();await ctx.settle();expect(readers.read).toHaveBeenCalledTimes(3);expect(ctx.effects.create).not.toHaveBeenCalled()});
it('manual-only mode suppresses automatic reads but allows Refresh',async()=>{const ctx=await setup();ctx.state().settings.syncIntervalMinutes=0;ctx.alarm();await ctx.settle();expect(readers.read).not.toHaveBeenCalled();await ctx.send('refreshOnOpen',{force:true});await vi.waitFor(()=>expect(readers.read).toHaveBeenCalledTimes(3));expect(ctx.effects.create).not.toHaveBeenCalled()});
it('checks Crowdmark grades automatically in a temporary page and merges the verified score',async()=>{const ctx=await setup();const entry:Entry={id:'crowdmark:a1',platform:'crowdmark',course:'MATH 135',title:'A01',type:'task',start:null,end:null,due:'2026-10-27T01:00:00Z',status:'submitted',url:'https://app.crowdmark.com/student/assessments/a1'};readers.read.mockImplementation(async(p:string)=>({entries:p==='crowdmark'?[entry]:[],courses:[]}));readers.grades.mockResolvedValue({entries:[{...entry,scorePercent:90,gradeStatus:'graded'}],courses:[]});ctx.alarm();await ctx.settle();expect(readers.grades).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({temporary:true,signal:expect.any(AbortSignal)}));expect(ctx.state().entries.find(e=>e.id===entry.id)).toMatchObject({scorePercent:90,gradeReadState:'fresh',due:entry.due});expect(ctx.effects.focus).not.toHaveBeenCalled()});
it('uses a temporary rendered Crowdmark read when the API session needs its normal sign-in redirect',async()=>{const ctx=await setup();readers.read.mockImplementation(async(p:string)=>{if(p==='crowdmark')throw Error('signed-out');return {entries:[],courses:[]}});readers.grades.mockResolvedValue({entries:[],courses:[],identity:'student'});ctx.alarm();await ctx.settle();expect(readers.grades).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({temporary:true,signIn:true}));expect(ctx.state().sources.crowdmark.status).toBe('ok');expect(ctx.effects.focus).not.toHaveBeenCalled()});

it('rejects malformed patches without poisoning settings or notes, and still permits unlinking',async()=>{
 const ctx=await setup();const entry:Entry={id:'learn:test',platform:'learn',course:'CS 135',title:'Assignment',type:'task',start:null,end:null,due:null,status:'open',url:''};
 ctx.state().entries=[entry];ctx.state().overlays[entry.id]={note:'keep',linkedTo:'learn:other'};
 expect(await ctx.send('overlay',{id:entry.id,patch:{note:{bad:true}}})).toMatchObject({ok:false});expect(ctx.state().overlays[entry.id].note).toBe('keep');
 expect(await ctx.send('settings',{patch:{taskLead:NaN}})).toMatchObject({ok:false});
 expect(await ctx.send('settings',{patch:{palette:'ocean',extraKey:true}})).toMatchObject({ok:true});expect(ctx.state().settings.palette).toBe('ocean');expect(ctx.state().settings).not.toHaveProperty('extraKey');
 expect(await ctx.send('overlay',{ids:[entry.id,'missing'],patch:{linkedTo:null,done:true}})).toMatchObject({ok:true});expect(ctx.state().overlays[entry.id]).toMatchObject({done:true,note:'keep'});expect(ctx.state().overlays[entry.id].linkedTo).toBeUndefined();expect(ctx.state().overlays).not.toHaveProperty('missing');
});
