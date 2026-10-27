// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {readLearnSchedule} from '../src/adapters/learn-schedule';
import {parseHtml} from '../src/background/html-parser';
afterEach(()=>vi.unstubAllGlobals());
it('reads the actual LEARN TOC envelope and topic fields with the numeric org unit, retaining the internal cache key',async()=>{
 const api=vi.fn(async(path:string)=>{if(path!=='/d2l/api/le/1.100/42/content/toc')throw Error('wrong-org-unit');return {Modules:[{Topics:[{TopicId:7,Identifier:'7',Title:'Course Schedule',TypeIdentifier:'File',Url:'/content/enforced/42-ECON101/toc/syllabus/course-schedule.html'},{TopicId:77,Title:'Module 7 Quiz',TypeIdentifier:'Link',Url:'/d2l/common/dialogs/quickLink/quickLink.d2l?ou=42&type=lti'}],Modules:[]}]}});
 const fetcher=vi.fn(async()=>({ok:true,status:200,headers:new Headers({'content-type':'text/html'}),text:async()=>'<table><tr><th>Module</th><th>Recommended Readings</th><th>Activities and Assessments</th><th>Available Date</th><th>Due Date</th><th>Weight</th></tr><tr><td>Module 7</td><td>Chapter 9</td><td>Module 7 Quiz</td><td>Wednesday, October 28, 2026 at 8:00 AM</td><td>Friday, October 30, 2026 at 11:00 PM</td><td>1%</td></tr></table>'}));
 const closeDocument=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('fetch',fetcher);vi.stubGlobal('chrome',{runtime:{getURL:(p:string)=>'chrome-extension://test/'+p,ContextType:{OFFSCREEN_DOCUMENT:'OFFSCREEN_DOCUMENT'},getContexts:async()=>[],sendMessage:async(msg:any)=>({ok:true,value:parseHtml(msg.kind,msg.html)})},offscreen:{Reason:{DOM_PARSER:'DOM_PARSER'},createDocument:vi.fn(),closeDocument}});
 const entries=await readLearnSchedule({versions:{le:'1.100'},api},{id:'ou42',orgUnitId:42,code:'ECON 101'});
 expect(entries).toHaveLength(1);expect(entries[0]).toMatchObject({readerCourseId:'ou42',title:'Module 7 Quiz',due:'2026-10-31T03:00:00Z',start:'2026-10-28T12:00:00Z',url:'https://learn.uwaterloo.ca/d2l/le/content/42/viewContent/77/View'});expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://learn.uwaterloo.ca/content/enforced/42-ECON101/toc/syllabus/course-schedule.html',expect.anything());expect(closeDocument).toHaveBeenCalledTimes(1);
});
it('reads the actual MATH 135 PDF schedule through the local PDF parser',async()=>{
 const bytes=new TextEncoder().encode('%PDF-1.7 synthetic fixture');vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes,{headers:{'content-type':'application/pdf'}})));
 const closeDocument=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('chrome',{runtime:{getURL:(p:string)=>p,ContextType:{OFFSCREEN_DOCUMENT:'OFFSCREEN_DOCUMENT'},getContexts:async()=>[],sendMessage:async(msg:any)=>{expect(msg.kind).toBe('pdf-text');expect(msg.bytes).toEqual([...bytes]);return {ok:true,value:'Assignment W1 due September 16, 2026 at 4:05 PM'}}},offscreen:{Reason:{DOM_PARSER:'DOM_PARSER'},createDocument:vi.fn(),closeDocument}});
 const source={versions:{le:'1.100'},api:async()=>({Modules:[{Topics:[{TopicId:6581845,Title:'Course Schedule',TypeIdentifier:'File',Url:'/content/enforced/1288715-MATH135_1269/CourseSchedule.pdf?ou=1288715'}]}]})};
 const items=await readLearnSchedule(source,{id:'ou1288715',orgUnitId:1288715,code:'MATH 135'});expect(items[0]).toMatchObject({title:'W1',due:'2026-09-16T20:05:00Z',readerCourseId:'ou1288715'});expect(closeDocument).toHaveBeenCalledTimes(1);
});
