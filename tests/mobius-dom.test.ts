// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {collectMobiusSettings,readMobius} from '../src/adapters/mobius';
import {parseHtml} from '../src/background/html-parser';
import {emptyState} from '../src/domain';
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';document.title=''});
it('reads settings metadata without interacting with controls',()=>{
 document.title='UW Möbius - View Policies';document.body.innerHTML='<a>ECON 101 Online - Fall 2026 - 081</a><h1>Module 6 Quiz</h1><h2>View Policies</h2><div id="reviewPolicies"><table><tr><th>Time Limit</th><td>20 minutes</td></tr><tr><th>Date</th><td>Start 2026/10/21 EDT 8:00:00 AM End 2026/10/23 EDT 11:00:00 PM</td></tr><tr><th>Question</th><td>DO NOT COLLECT</td></tr></table></div><button>Start</button>';
 const click=vi.fn();document.querySelector('button')!.addEventListener('click',click);const data=collectMobiusSettings();expect(data?.rows).toHaveLength(2);expect(JSON.stringify(data)).not.toContain('DO NOT COLLECT');expect(click).not.toHaveBeenCalled();
 document.title='UW Möbius - Assignment';document.querySelector('h2')!.remove();expect(collectMobiusSettings()).toBeNull();
});
it('never fetches, creates or revives a page when none is loaded',async()=>{
 const create=vi.fn(),reload=vi.fn(),executeScript=vi.fn(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('chrome',{tabs:{query:async()=>[{id:1,status:'complete',discarded:true}],create,reload},scripting:{executeScript}});
 const state=emptyState();state.settings.mobiusEnabled=true;await expect(readMobius(state)).rejects.toThrow('mobius-settings-required');expect(create).not.toHaveBeenCalled();expect(reload).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(executeScript).not.toHaveBeenCalled();
});
it('reads only file-type Course Schedule topics, never launches an external tool',async()=>{
 const {readLearnSchedule}=await import('../src/adapters/learn-schedule');
 const api=vi.fn().mockResolvedValue([{Topics:[{Id:3,Title:'Module 6 Quiz',TopicType:3},{Id:2,Title:'Course Schedule',TopicType:3},{Id:1,Title:'Course Schedule',TopicType:1}]}]);
 const executeScript=vi.fn(),createDocument=vi.fn(),closeDocument=vi.fn();
 const fetcher=vi.fn(async()=>({ok:true,status:200,headers:new Headers({'content-type':'text/html'}),text:async()=>'<table><tr><td>Activities and Assessments</td><td>Available Date</td><td>Due Date</td><td>Weight</td></tr><tr><td>Module 6 Quiz</td><td>Wednesday, October 21, 2026 at 8:00 AM</td><td>Friday, October 23, 2026 at 11:00 PM</td><td>1%</td></tr></table>'}));
 vi.stubGlobal('fetch',fetcher);vi.stubGlobal('chrome',{scripting:{executeScript},runtime:{getURL:(path:string)=>'chrome-extension://test/'+path,ContextType:{OFFSCREEN_DOCUMENT:'OFFSCREEN_DOCUMENT'},getContexts:async()=>[],sendMessage:async(msg:any)=>({ok:true,value:parseHtml(msg.kind,msg.html)})},offscreen:{Reason:{DOM_PARSER:'DOM_PARSER'},createDocument,closeDocument:async()=>{closeDocument()}}});
 const result=await readLearnSchedule({versions:{le:'1.82'},api},{id:'12',code:'ECON 101'},8);expect(executeScript).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledWith('https://learn.uwaterloo.ca/d2l/api/le/1.82/12/content/topics/1/file?stream=true',expect.objectContaining({redirect:'manual'}));expect(closeDocument).toHaveBeenCalledTimes(1);expect(result[0].url).toBe('https://learn.uwaterloo.ca/d2l/le/content/12/viewContent/3/View');
});
it('reads the actual list-based UW settings layout and keeps breadcrumb labels out of identity',()=>{
 document.title='UW Möbius - 查看设置';document.body.innerHTML='<nav id="pageHeader"><ol class="breadcrumb"><li> ECON 101 Online - Fall 2026 - 081 </li><li>查看设置</li></ol></nav><h1>Module 6 Quiz</h1><div id="reviewPolicies"><h2>查看设置</h2><div id="launchInfo"><ul><li class="row list-group-item"><div class="col-xs-6">时间限制<i title="help"></i></div><div class="col-xs-6">20 分钟<i></i></div></li><li class="row list-group-item"><div>日期</div><div>开始 2026/10/21 EDT 上午8:00:00 结束 2026/10/23 EDT 下午11:00:00</div></li><li><div>已记录的结果</div><div>是</div></li></ul></div></div>';
 expect(collectMobiusSettings()).toEqual({course:'ECON 101 Online - Fall 2026 - 081',title:'Module 6 Quiz',rows:[['时间限制','20 分钟'],['日期','开始 2026/10/21 EDT 上午8:00:00 结束 2026/10/23 EDT 下午11:00:00']]});
});
