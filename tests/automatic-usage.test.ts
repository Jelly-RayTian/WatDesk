import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {emptyState} from '../src/domain';
vi.mock('../src/background/school-login',()=>({configureSchoolLogin:async()=>{}}));
vi.mock('../src/background/sync-schedule',()=>({configureSyncSchedule:async()=>{},syncMinutes:()=>0}));
beforeEach(()=>vi.resetModules());
afterEach(()=>vi.unstubAllGlobals());
async function setup(disabled=false){
 let state=emptyState();if(disabled)state.settings.usageStats={enabled:false};let listener:any;
 const received:any[]=[];vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{received.push({url,body:JSON.parse(String(init.body))});return new Response('ok')});
 vi.stubGlobal('chrome',{storage:{local:{get:async()=>({watdesk:structuredClone(state)}),set:async(v:any)=>{state=v.watdesk}}},runtime:{id:'test',getManifest:()=>({version:'1.9.0'}),onMessage:{addListener:(f:any)=>{listener=f}},onInstalled:{addListener:()=>{}},onStartup:{addListener:()=>{}}},alarms:{onAlarm:{addListener:()=>{}}},tabs:{onUpdated:{addListener:()=>{}}}});
 await import('../src/background/worker');
 const open=()=>new Promise<any>(resolve=>listener({type:'state'},{id:'test'},resolve));
 return {open,received,state:()=>state};
}
it('counts the first workspace opening automatically, persists the same ID and deduplicates concurrent openings',async()=>{
 const ctx=await setup();expect(ctx.received).toHaveLength(0);
 await Promise.all([ctx.open(),ctx.open()]);
 await vi.waitFor(()=>expect(ctx.received).toHaveLength(1));
 expect(ctx.state().settings.usageStats).toMatchObject({enabled:true,id:expect.stringMatching(/^[0-9a-f-]{36}$/)});
 expect(ctx.received[0]).toEqual({url:'https://watdesk-stats.guojelly123.workers.dev/ping',body:{id:ctx.state().settings.usageStats!.id,version:'1.9.0'}});
 await vi.waitFor(()=>expect(ctx.state().settings.usageStats?.lastPing).toBe(new Date().toISOString().slice(0,10)));
 await ctx.open();expect(ctx.received).toHaveLength(1);
});
it('preserves a previously disabled counter and sends nothing when the workspace opens',async()=>{
 const ctx=await setup(true);await ctx.open();expect(ctx.state().settings.usageStats).toEqual({enabled:false});expect(ctx.received).toHaveLength(0);
});
