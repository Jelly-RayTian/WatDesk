import {it,expect} from 'vitest';
import {parseCs241,parseCs240,parseCs145,readCourseSites} from '../src/adapters/course-sites';
import {emptyState} from '../src/domain';
const NOW=Date.parse('2026-10-29T15:00:00Z');
const CS241=`<ul>
<!--<li><a href="$(assignment link)">Assignment n</a> (due $(date) at $(time))</li>-->
<li><a href="/~cs241/a1/">Assignment 1</a> (due September 25th at 5:00pm)</li>
<li><a href="/~cs241/a5/">Assignment 5</a> (due November 9th at 5:00pm)</li>
<li><!--<a href="/~cs241/a6/">-->Assignment 6<!--</a>--> (due November 20th at 5:00pm)</li>
<li><!--<a href="/~cs241/a8/">-->Assignment 8<!--</a>--> (due December 4th at 5:00pm)</li></ul>`;
const CS240=`<table><thead><tr><th scope='col'>Assignment</th><th scope='col'>Release date (Tentative)</th><th scope='col'>Due date and time</th></tr></thead><tbody>
<tr><th scope='row'>Assignment 1</th><td><ul>Tuesday, September 10, 2026</ul></td><td><ul>Tuesday, September 22, 2026 at 5pm</ul></td></tr>
<tr><th scope='row'>Assignment 3</th><td><ul>Tuesday, October 20, 2026</ul></td><td><ul>Tuesday, November 3, 2026 at 5pm</ul></td></tr>
<tr><th scope='row' style="background-color:Tomato;"> <p style="color: White;">Midterm Exam (In-person)</p></th><td><ul>Thursday, October 22, 2026 at 4:30pm</ul></td><td><ul>Thursday, October 22, 2026 at 6:20pm</ul></td></tr>
<tr><th scope='row'>Programming Question 1 (PQ1)</th><td><ul>Tuesday, October 6, 2026</ul></td><td><ul>Friday, November 6, 2026 at 5pm</ul></td></tr></tbody></table>`;
const CS145=`<p>Fall 2026 Midterm 1 date: Thursday, October 8th, 2026, 7:00 pm - 8:50 pm</p><p>Fall 2026 Midterm 2 date: Monday, November 9th, 2026, 7:00 pm - 8:50 pm</p><h2>Calendar</h2>`;
it('CS 241 reads dated assignments, ignores commented template lines and long-past ones',()=>{
 const e=parseCs241(CS241,NOW);
 expect(e.map(x=>x.title)).toEqual(['Assignment 5','Assignment 6','Assignment 8']);
 expect(e[0]).toMatchObject({id:'sites:cs241:assignment-5',platform:'sites',course:'CS 241',type:'task',due:'2026-11-09T22:00:00Z'});
});
it('CS 240 reads due dates and treats the midterm row as an exam with start and end',()=>{
 const e=parseCs240(CS240,'f26',NOW);
 expect(e.map(x=>x.title)).toEqual(['Assignment 3','Midterm Exam (In-person)','Programming Question 1 (PQ1)']);
 expect(e[0]).toMatchObject({type:'task',due:'2026-11-03T22:00:00Z'});
 expect(e[1]).toMatchObject({type:'exam',start:'2026-10-22T20:30:00Z',end:'2026-10-22T22:20:00Z',due:null});
});
it('CS 145 reads midterm windows',()=>{
 const e=parseCs145(CS145,NOW);
 expect(e).toHaveLength(1);
 expect(e[0]).toMatchObject({id:'sites:cs145:midterm-2',type:'exam',start:'2026-11-10T00:00:00Z',end:'2026-11-10T01:50:00Z'});
});
it('refuses pages that no longer look like the expected site',()=>{
 expect(()=>parseCs241('<html><body>Moved</body></html>',NOW)).toThrow('site-format:cs241');
 expect(()=>parseCs240('<html></html>','f26',NOW)).toThrow('site-format:cs240');
 expect(()=>parseCs145('<p>Gone</p>',NOW)).toThrow('site-format:cs145');
});
it('keeps the last data for a course whose page fails and reports a partial read',async()=>{
 const s=emptyState();s.settings.courseSites=['cs241','cs145'];
 s.entries=[{id:'sites:cs241:assignment-5',platform:'sites',course:'CS 241',title:'Assignment 5',type:'task',start:null,end:null,due:'2026-11-09T22:00:00Z',status:'open',url:''}];
 const fetcher=(async(u:string)=>u.includes('cs145')?new Response(CS145,{status:200}):new Response('',{status:500})) as unknown as typeof fetch;
 const r=await readCourseSites(s,fetcher,NOW);
 expect(r.warning).toBe('sites-partial:cs241=http-500');
 expect(r.entries.map(e=>e.id).sort()).toEqual(['sites:cs145:midterm-2','sites:cs241:assignment-5']);
 expect(r.entries.find(e=>e.id==='sites:cs241:assignment-5')?.readState).toBe('retained');
});
it('fails outright only when every enabled site fails',async()=>{
 const s=emptyState();s.settings.courseSites=['cs241'];
 const fetcher=(async()=>new Response('',{status:404})) as unknown as typeof fetch;
 await expect(readCourseSites(s,fetcher,NOW)).rejects.toThrow('sites-unavailable:cs241=http-404');
});
