import {expect,it} from 'vitest';
import {crowdmarkRelay} from '../src/adapters/crowdmark-bridge';
it('rejects relay paths that leave the student API after URL parsing',async()=>{
 for(const path of ['/api/v2/student/%2e%2e/%2e%2e/admin','/api/v2/student/../x','https://evil.example/api/v2/student/','/api/v2/admin'])await expect(crowdmarkRelay(path)).rejects.toThrow('path');
});

import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {vi,afterEach} from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
it('the packaged content bridge checks normalized paths and allows dots in query values',async()=>{
 let handler:any;
 const fetcher=vi.fn(async()=>({status:200,ok:true,redirected:false,headers:new Headers({'content-type':'application/json'}),json:async()=>({data:[]})}));
 runInNewContext(readFileSync('src/content/crowdmark-bridge.js','utf8'),{
  window:{},location:new URL('https://app.crowdmark.com/student/courses'),URL,AbortSignal,fetch:fetcher,
  chrome:{runtime:{onMessage:{addListener:(fn:any)=>{handler=fn}},sendMessage:async()=>{}}}
 });
 for(const path of ['/api/v2/student/%2e%2e/%2e%2e/admin','/api/v2/student/.%2e/x','https://evil.example/api/v2/student/']){
  const respond=vi.fn();expect(handler({type:'crowdmark:fetch',path},{},respond)).toBe(false);expect(respond).toHaveBeenCalledWith({status:0,error:'path not allowed'});
 }
 expect(fetcher).not.toHaveBeenCalled();
 const path='/api/v2/student/assignments?filter[course]=slug..value';
 const out=await new Promise(resolve=>handler({type:'crowdmark:fetch',path},{},resolve));expect(out).toMatchObject({status:200});expect(fetcher.mock.calls[0][0]).toBe('https://app.crowdmark.com'+path);
});
it('normalizes allowed relay paths before sending and keeps legitimate dotted identifiers',async()=>{
 const send=vi.fn(async()=>({status:200}));vi.stubGlobal('chrome',{tabs:{query:async()=>[{id:1,status:'complete'}],sendMessage:send}});
 await crowdmarkRelay('/api/v2/student/sub/../assignments?filter[course]=slug..value');
 expect(send).toHaveBeenCalledWith(1,{type:'crowdmark:fetch',path:'/api/v2/student/assignments?filter[course]=slug..value'});
});
