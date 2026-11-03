// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseHtml} from '../src/background/html-parser';
import {parseOutlineDates,parseOutlineRows,readOutline,outlineYear,type OutlinePage} from '../src/adapters/outline';
import {emptyState,type Entry} from '../src/domain';
import {visibleEntries,outlineUncovered} from '../src/core/state';
const now=Date.parse('2026-10-26T15:00:00Z');
const header=['Component / Activity','Date or Due Date','Location / Submission Method','Weight (%)'];
it('reads only the assessments table of an outline page',()=>{
 const page=parseHtml('outline',readFileSync('fixtures/outline-sample.html','utf8')) as OutlinePage;
 expect(page.heading).toContain('ENGL 119 Fall 2026');expect(outlineYear(page.heading)).toBe(2026);
 expect(page.rows[0]).toEqual(header);expect(page.rows.find(r=>r[0]==='Midterm 1')![1]).toBe('Available: Tuesday, October 20, 2026 at 12:01 AM Due: Tuesday, October 20, 2026 at 11:59 PM');expect(page.rows.map(r=>r[0])).not.toContain('Unrelated');
 expect(()=>parseHtml('outline','<h1>Fall 2026</h1>')).toThrow('outline-format');
});
it('parses explicit dates and refuses to guess',()=>{
 const d=(t:string)=>parseOutlineDates(t,2026).map(v=>`${v.m+1}/${v.d}${v.time?'@'+v.time:''}`);
 expect(d('October 27')).toEqual(['10/27']);
 expect(d('October 6 & 8')).toEqual(['10/6','10/8']);
 expect(d('November 17th and November 19th')).toEqual(['11/17','11/19']);
 expect(d('December 3rd and 8th')).toEqual(['12/3','12/8']);
 expect(d('Wednesday October 21')).toEqual(['10/21']);
 expect(d('Due: Friday, September 11, 2026 at 11:00 PM')).toEqual(['9/11@23:00']);
 for(const none of ['','TBD during final exam period','Wednesdays',"To be scheduled by the Registrar's Office",'Available: Wednesdays at 8:00 AM* Due: Fridays at 11:00 PM*','October 10-October 18','Reading Week: October 10 - October 18'])expect(d(none)).toEqual([]);
});
it('turns assessment rows into date-only tasks and exams, one entry per date',()=>{
 const rows=[header,['Participation and Attendance','','In-Person','15%'],['Video Podcast','October 27','LEARN Drop Box','15%'],['Proposal Test','November 3','In-Person','10%'],['Recommendation Report','November 17th and November 19th','In-Person','20%'],
  ['Midterm 1','Available: Tuesday, October 20, 2026 at 12:01 AM Due: Tuesday, October 20, 2026 at 11:59 PM','LEARN Quiz','20%'],['Final Exam',"To be scheduled by the Registrar's Office",'In-person','50%']];
 const out=parseOutlineRows(rows,{course:'ENGL 119',outlineId:'nbyw37',year:2026,now});
 const by=(t:string)=>out.find(e=>e.title===t)!;
 expect(by('Video Podcast')).toMatchObject({platform:'outline',type:'task',dateOnly:'2026-10-27',due:'2026-10-28T03:59:59Z',url:'https://outline.uwaterloo.ca/viewer/view/nbyw37#assessments_amp_activities'});
 expect(by('Proposal Test')).toMatchObject({type:'exam',category:'quiz',dateOnly:'2026-11-03',start:'2026-11-04T04:59:59Z',due:null});
 expect(out.filter(e=>e.title.startsWith('Recommendation Report')).map(e=>e.title)).toEqual(['Recommendation Report (1/2)','Recommendation Report (2/2)']);
 expect(by('Midterm 1')).toMatchObject({type:'task',category:'quiz',start:'2026-10-20T04:01:00Z',due:'2026-10-21T03:59:00Z'});expect(by('Midterm 1').dateOnly).toBeUndefined();
 expect(out.map(e=>e.title)).not.toContain('Final Exam');expect(out.map(e=>e.title)).not.toContain('Participation and Attendance');
 expect(new Set(out.map(e=>e.id)).size).toBe(out.length);
 expect(()=>parseOutlineRows([['Something'],['else']],{course:'X 1',outlineId:'a',year:2026})).toThrow('outline-format');
});
const page=(rows:string[][])=>async()=>({heading:'ENGL 119 Fall 2026',rows}) as OutlinePage;
it('reads every course in the personal list for the latest term and keeps old data when one page fails',async()=>{
 const s=emptyState();s.settings.outlineEnabled=true;
 const list=[{courses:'ENGL 119',term:'1269',url:'/viewer/view/nbyw37'},{courses:'MATH 135',term:'1269',url:'/viewer/view/nbqzvm'},{courses:'OLD 100',term:'1261',url:'/viewer/view/zzzzzz'},{courses:'bad',term:'1269',url:'https://evil.example/x'}];
 const fetched:string[]=[];
 const ok=await readOutline(s,{list:async()=>list,page:async url=>{fetched.push(url);if(url.endsWith('nbqzvm'))throw Error('outline-format');return page([header,['Video Podcast','October 27','LEARN Drop Box','15%']])()}},now);
 expect(fetched).toEqual(['https://outline.uwaterloo.ca/viewer/view/nbyw37','https://outline.uwaterloo.ca/viewer/view/nbqzvm']);
 expect(ok.entries.map(e=>e.title)).toEqual(['Video Podcast']);expect(ok.warning).toBe('outline-partial:MATH 135=layout');
 const kept:Entry={...ok.entries[0],id:'outline:nbqzvm:midterm:2026-10-21',course:'MATH 135',title:'Midterm'};s.entries=[kept];
 const again=await readOutline(s,{list:async()=>list,page:async url=>url.endsWith('nbqzvm')?Promise.reject(Error('network')):page([header,['Video Podcast','October 27','x','1%']])()},now);
 expect(again.entries.find(e=>e.id===kept.id)?.readState).toBe('retained');
 await expect(readOutline(s,{list:async()=>[],page:page([])},now)).rejects.toThrow('outline-no-courses');
 await expect(readOutline(s,{list:async()=>{throw Error('signed-out')},page:page([])},now)).rejects.toThrow('signed-out');
 await expect(readOutline(emptyState(),{list:async()=>list,page:page([])},now)).rejects.toThrow('outline-disabled');
});
it('shows an outline item only when no other source lists it that day, and only while enabled',()=>{
 const base={course:'ENGL 119',type:'task' as const,start:null,end:null,status:'open' as const,url:'',category:'assignment' as const};
 const outline:Entry={...base,id:'outline:a:video-podcast:2026-10-27',platform:'outline',title:'Video Podcast',dateOnly:'2026-10-27',due:'2026-10-28T03:59:59Z'};
 const learn:Entry={...base,id:'learn:1',platform:'learn',title:'Video Podcast / Vlog',due:'2026-10-28T03:59:00Z'};
 const other:Entry={...base,id:'outline:a:five-sources:2026-11-05',platform:'outline',title:'Five Sources',dateOnly:'2026-11-05',due:'2026-11-06T04:59:59Z'};
 expect(outlineUncovered([outline,learn,other],'America/Toronto').map(e=>e.id)).toEqual(['learn:1','outline:a:five-sources:2026-11-05']);
 const s=emptyState();s.entries=[outline,other];expect(visibleEntries(s)).toHaveLength(0);
 s.settings.outlineEnabled=true;expect(visibleEntries(s).map(e=>e.id).sort()).toEqual([other.id,outline.id].sort());
});
