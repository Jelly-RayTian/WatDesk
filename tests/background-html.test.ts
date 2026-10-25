// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {parseHtml} from '../src/background/html-parser';
import {parseBackgroundHtml} from '../src/adapters/background-html';
afterEach(()=>vi.unstubAllGlobals());
it('parses inert schedules without running scripts or touching the visible document',()=>{document.body.innerHTML='<p>User page</p>';const data=parseHtml('rows','<script>document.body.innerHTML="changed"</script><table><tr><td>Quiz</td><td>date</td></tr></table>');expect(data).toEqual([['Quiz','date']]);expect(document.body.textContent).toBe('User page');expect(()=>parseHtml('unknown','')).toThrow('parse-kind')});
it('rejects oversized documents before creating a parser',async()=>{const create=vi.fn();vi.stubGlobal('chrome',{offscreen:{createDocument:create}});await expect(parseBackgroundHtml('rows','x'.repeat(2000001))).rejects.toThrow('html-too-large');expect(create).not.toHaveBeenCalled()});
it('serializes concurrent parsers and closes each on success or failure without tabs',async()=>{
 const events:string[]=[];let active=0;const tabs={create:vi.fn(),update:vi.fn()};
 vi.stubGlobal('chrome',{tabs,runtime:{getURL:(p:string)=>p,ContextType:{OFFSCREEN_DOCUMENT:'OFFSCREEN_DOCUMENT'},getContexts:async()=>[],sendMessage:async(msg:any)=>{events.push(msg.kind);if(msg.html==='fail')throw Error('parse-failed');return {ok:true,value:parseHtml(msg.kind,msg.html)}}},offscreen:{Reason:{DOM_PARSER:'DOM_PARSER'},createDocument:async()=>{expect(active).toBe(0);active++;events.push('open')},closeDocument:async()=>{active--;events.push('close')}}});
 const results=await Promise.allSettled([parseBackgroundHtml('rows','<table><tr><td>A</td></tr></table>'),parseBackgroundHtml('odyssey','fail'),parseBackgroundHtml('rows','')]);
 expect(results.map(r=>r.status)).toEqual(['fulfilled','rejected','fulfilled']);expect(active).toBe(0);expect(events).toEqual(['open','rows','close','open','odyssey','close','open','rows','close']);expect(tabs.create).not.toHaveBeenCalled();expect(tabs.update).not.toHaveBeenCalled();
});
it('parses Odyssey column spans and rejects login content at the reader boundary',()=>{expect(parseHtml('odyssey','<h1>Assessment Schedule (student)</h1><main><table><tr><th>Exam</th><th>When</th></tr><tr><td colspan="2">TBA</td></tr></table></main>')).toMatchObject({heading:'Assessment Schedule (student)',rows:[['Exam','When'],['TBA','']]})});
it('accepts worker messages without a page URL and isolates website content scripts',async()=>{
 let receive:any;vi.stubGlobal('chrome',{runtime:{id:'test',getURL:(p:string)=>'chrome-extension://test/'+p,onMessage:{addListener:(fn:any)=>{receive=fn}}}});await import('../src/background/offscreen');
 const response=vi.fn();receive({target:'offscreen',kind:'rows',html:'<table><tr><td>Quiz</td></tr></table>'},{id:'test'},response);expect(response).toHaveBeenCalledWith({ok:true,value:[['Quiz']]});response.mockClear();receive({target:'offscreen',kind:'rows',html:''},{id:'test',tab:{id:1},url:'https://learn.uwaterloo.ca'},response);expect(response).not.toHaveBeenCalled();
});
