import {it,expect,vi} from 'vitest';
import {isUsageStats,sendUsagePing,usageBody,utcDay,statsConfigured,STATS_ENDPOINT} from '../src/core/stats';
import {settingsPatch} from '../src/core/patches';
import {emptyState} from '../src/domain';
import {validateBackup} from '../src/core/util';
// @ts-ignore plain JS Worker
import worker from '../stats-worker/src/index.js';
const ID='3f2b8c1e-9a4d-4e6b-8c2a-1d5e7f9a0b34',EP='https://watdesk-stats.example.workers.dev/ping',NOW=Date.parse('2026-10-29T15:00:00Z');
it('ships disabled: no endpoint means nothing can be sent or shown',()=>{expect(STATS_ENDPOINT).toBe('');expect(statsConfigured()).toBe(false)});
it('validates the stored shape strictly',()=>{
 expect(isUsageStats({enabled:true,id:ID,lastPing:'2026-10-29'})).toBe(true);expect(isUsageStats({enabled:false})).toBe(true);
 for(const bad of [null,[],{},{enabled:'yes'},{enabled:true,id:'abc'},{enabled:true,extra:1},{enabled:true,lastPing:'today'}])expect(isUsageStats(bad)).toBe(false);
 expect(settingsPatch({usageStats:{enabled:true,id:ID}})).toEqual({usageStats:{enabled:true,id:ID}});
 expect(()=>settingsPatch({usageStats:{enabled:true,id:'x'}})).toThrow('invalid');
 const s=emptyState();s.settings.usageStats={enabled:true,id:ID};expect(validateBackup(JSON.stringify(s)).settings.usageStats?.id).toBe(ID);
 const bad:any=emptyState();bad.settings.usageStats={enabled:true,id:'x'};expect(()=>validateBackup(JSON.stringify(bad))).toThrow('restoreError');
});
it('sends only the id and version, at most once a day, and only when opted in',async()=>{
 const post=vi.fn(async()=>new Response('ok',{status:200}));
 expect(await sendUsagePing(undefined,'1.9.0',NOW,post as any,EP)).toBeNull();
 expect(await sendUsagePing({enabled:false,id:ID},'1.9.0',NOW,post as any,EP)).toBeNull();
 expect(await sendUsagePing({enabled:true,id:ID},'1.9.0',NOW,post as any,'')).toBeNull();expect(post).not.toHaveBeenCalled();
 const sent=await sendUsagePing({enabled:true,id:ID},'1.9.0',NOW,post as any,EP);
 expect(sent).toEqual({enabled:true,id:ID,lastPing:utcDay(NOW)});
 const [url,init]=post.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe(EP);expect(JSON.parse(String(init.body))).toEqual(usageBody(ID,'1.9.0'));expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual(['id','version']);expect(init.credentials).toBe('omit');
 expect(await sendUsagePing(sent!,'1.9.0',NOW,post as any,EP)).toBeNull();expect(post).toHaveBeenCalledTimes(1);
 expect(await sendUsagePing({enabled:true,id:ID,lastPing:'2026-10-28'},'1.9.0',NOW,post as any,EP)).not.toBeNull();
});
it('keeps lastPing unchanged when the server fails so it retries later',async()=>{
 expect(await sendUsagePing({enabled:true,id:ID},'1.9.0',NOW,(async()=>new Response('',{status:500})) as any,EP)).toBeNull();
 expect(await sendUsagePing({enabled:true,id:ID},'1.9.0',NOW,(async()=>{throw Error('offline')}) as any,EP)).toBeNull();
});
function kv(){const m=new Map<string,{v:string;meta:any}>();return {m,put:async(k:string,v:string,o:any)=>{m.set(k,{v,meta:o?.metadata})},list:async()=>({keys:[...m.entries()].map(([name,x])=>({name,metadata:x.meta})),list_complete:true})}}
it('the Worker records one key per install per day, rejects bad input and protects the summary',async()=>{
 const env={STATS:kv(),STATS_TOKEN:'secret-token'};const post=(body:string)=>worker.fetch(new Request('https://w.dev/ping',{method:'POST',body}),env);
 expect((await post(JSON.stringify({id:ID,version:'1.9.0'}))).status).toBe(200);expect((await post(JSON.stringify({id:ID,version:'1.9.0'}))).status).toBe(200);
 expect(env.STATS.m.size).toBe(1);
 expect((await post(JSON.stringify({id:'nope',version:'1.9.0'}))).status).toBe(400);expect((await post('{')).status).toBe(400);expect((await post('x'.repeat(300))).status).toBe(413);
 expect((await worker.fetch(new Request('https://w.dev/summary'),env)).status).toBe(401);
 const ok=await worker.fetch(new Request('https://w.dev/summary',{headers:{authorization:'Bearer secret-token'}}),env);
 const body=await ok.json();expect(body.today).toBe(1);expect(body.activeLast30Days).toBe(1);expect(body.versionsToday).toEqual({'1.9.0':1});
 expect((await worker.fetch(new Request('https://w.dev/other'),env)).status).toBe(404);
});
