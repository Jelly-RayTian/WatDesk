import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {emptyState} from '../src/domain';
const hoisted=vi.hoisted(()=>({fetcher:vi.fn()}));
vi.mock('../src/adapters/read',async()=>{const {readCourseSites}=await import('../src/adapters/course-sites');return {readPlatform:async(p:string,state:any)=>{if(p==='sites')return readCourseSites(state,hoisted.fetcher as unknown as typeof fetch);return {entries:[],courses:[]}}}});
vi.mock('../src/adapters/login',()=>({autoLogin:vi.fn()}));
vi.mock('../src/adapters/crowdmark-api',()=>({enrichCrowdmarkGrades:vi.fn(async()=>({entries:[],courses:[]}))}));
vi.mock('../src/background/school-login',()=>({configureSchoolLogin:async()=>{}}));
const CS241=`<ul><li><a href="/~cs241/a9/">Assignment 9</a> (due December 4th at 5:00pm)</li></ul>`;
beforeEach(()=>{vi.resetModules();hoisted.fetcher.mockReset().mockImplementation(async()=>new Response(CS241,{status:200}))});
afterEach(()=>vi.unstubAllGlobals());
async function setup(granted=true){
 let state=emptyState();state.settings.onboardingComplete=true;let message:any;
 vi.stubGlobal('chrome',{
  storage:{local:{get:async()=>({watdesk:structuredClone(state)}),set:async(data:any)=>{state=data.watdesk}}},
  tabs:{query:async()=>[],get:async()=>({id:99,status:'complete'}),create:vi.fn(),update:vi.fn()},
  windows:{update:vi.fn()},permissions:{contains:async()=>granted},notifications:{create:async()=>''},
  runtime:{id:'test',onMessage:{addListener:(fn:any)=>{message=fn}},onInstalled:{addListener:()=>{}},onStartup:{addListener:()=>{}}},
  alarms:{get:async()=>({periodInMinutes:360}),create:async()=>{},clear:async()=>true,onAlarm:{addListener:()=>{}}}
 });
 await import('../src/background/worker');
 const send=(type:string,extra:object={})=>new Promise<any>(resolve=>message({type,...extra},{id:'test'},resolve));
 await send('state');return {send,state:()=>state};
}
it('enabling a readable course site reads it right away and stores its assignments',async()=>{
 const ctx=await setup();
 await ctx.send('settings',{patch:{courseSites:['cs241']}});
 await vi.waitFor(()=>expect(ctx.state().sources.sites?.status).toBe('ok'));
 expect(hoisted.fetcher).toHaveBeenCalledWith(expect.stringContaining('/~cs241/assignments/'),expect.anything());
 expect(ctx.state().entries.map(e=>e.id)).toContain('sites:cs241:assignment-9');
});
it('Refresh on the Course websites source reads again',async()=>{
 const ctx=await setup();await ctx.send('settings',{patch:{courseSites:['cs241']}});
 await vi.waitFor(()=>expect(ctx.state().sources.sites?.status).toBe('ok'));hoisted.fetcher.mockClear();
 await ctx.send('sync',{platform:'sites'});await vi.waitFor(()=>expect(hoisted.fetcher).toHaveBeenCalled());
});
it('disabling the course removes its entries and the source',async()=>{
 const ctx=await setup();await ctx.send('settings',{patch:{courseSites:['cs241']}});
 await vi.waitFor(()=>expect(ctx.state().entries.length).toBeGreaterThan(0));
 await ctx.send('settings',{patch:{courseSites:[]}});
 expect(ctx.state().entries.filter(e=>e.platform==='sites')).toEqual([]);expect(ctx.state().sources.sites).toBeUndefined();
});

it('reports a missing permission on the source instead of silently doing nothing',async()=>{
 const ctx=await setup(false);
 await ctx.send('settings',{patch:{courseSites:['cs241']}});
 expect(ctx.state().sources.sites).toMatchObject({status:'error',error:'permission'});expect(hoisted.fetcher).not.toHaveBeenCalled();
});
