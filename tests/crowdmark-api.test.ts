import {it,expect,vi,afterEach} from 'vitest';
import {emptyState} from '../src/domain';
import {readPlatform} from '../src/adapters/read';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
const courses={data:[{id:'math-135-fall-2026',attributes:{name:'MATH 135 - Fall 2026'}}]};
const assignments={data:[{id:'api-id',attributes:{due:'2026-10-20T20:00:00Z','submitted-at':'2026-10-19T20:00:00Z'},relationships:{'exam-master':{data:{id:'practice',type:'exam-masters'}}}}],included:[{id:'practice',type:'exam-masters',attributes:{title:'Practice'}}]};
it('uses the byte-identical upstream reader and bridge',()=>{
 for(const [file,digest] of [['data/crowdmark-source.js','c479134c1d121f79db7d61297cde537d6a368fb43db353764226b37fa8e36407'],['content/crowdmark-bridge.js','eb0e25f1c6a95086b8cd109c144a01d99f8ab44f22ec51623a1bfd8d8c849f17']])expect(createHash('sha256').update(readFileSync('src/vendor/watnow/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe(digest);
});
it('imports through the actual upstream worker reader without any tab or DOM identity gate',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
 const execute=vi.fn(()=>{throw Error('DOM unavailable')});
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},scripting:{getRegisteredContentScripts:async()=>[],registerContentScripts:async()=>{},executeScript:execute},tabs:{query:async()=>[]}});
 const fetcher=vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes('/assignments?')?assignments:courses),{status:200,headers:{'content-type':'application/vnd.api+json'}}));vi.stubGlobal('fetch',fetcher);
 const result=await readPlatform('crowdmark',emptyState());expect(result.entries[0].title).toBe('Practice');expect(result.entries[0].status).toBe('submitted');expect(execute).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(2);
});
it('uses WATnow tab messaging when worker fetch is signed out, without requiring DOM selectors',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
 const send=vi.fn(async(_id:number,msg:any)=>({status:200,type:'application/json',json:msg.path.includes('/assignments?')?assignments:courses}));
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},scripting:{getRegisteredContentScripts:async()=>[],registerContentScripts:async()=>{},executeScript:async()=>{throw Error('Frame with ID 0 was removed.')}},tabs:{query:async()=>[{id:1,active:true}],sendMessage:send}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:401})));
 const result=await readPlatform('crowdmark',emptyState());expect(result.entries[0].title).toBe('Practice');expect(send).toHaveBeenCalledTimes(2);
});
it('propagates upstream signed-out status instead of a DOM-session error',async()=>{
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},scripting:{getRegisteredContentScripts:async()=>[] ,registerContentScripts:async()=>{}},tabs:{query:async()=>[]}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:401})));
 await expect(readPlatform('crowdmark',emptyState())).rejects.toThrow('signed-out');
});
