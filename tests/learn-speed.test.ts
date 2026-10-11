import {it,expect,vi} from 'vitest';
import {readLearnCourses} from '../src/adapters/learn-batch';
// @ts-ignore upstream JS reader
import {LiveSource} from '../src/vendor/watnow/data/live-source.js';
it('limits concurrent courses to two and warms shared data before reading',async()=>{
 const events:string[]=[];let active=0,max=0;
 const source={ensureFeed:async()=>{events.push('feed')},ensureCalendar:async()=>{events.push('calendar')},listDeadlines:async(c:number)=>{events.push('course');active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return c}};
 const result=await readLearnCourses(source,[1,2,3,4,5]);expect(events.slice(0,2)).toEqual(['feed','calendar']);expect(max).toBe(2);expect(result.map(r=>r.status==='fulfilled'?r.value:null)).toEqual([1,2,3,4,5]);
});
it('keeps failures explicit and propagates a failed shared read',async()=>{
 const source={ensureFeed:async()=>{},ensureCalendar:async()=>{},listDeadlines:async(c:number)=>{if(c===2)throw Error('signed-out');return c}};
 expect((await readLearnCourses(source,[1,2,3])).map(r=>r.status)).toEqual(['fulfilled','rejected','fulfilled']);
 source.ensureFeed=async()=>{throw Error('network')};await expect(readLearnCourses(source,[1])).rejects.toThrow('network');
});
it('produces identical upstream deadlines and completeness with fewer simulated network waits',async()=>{
 vi.useFakeTimers();
 try{
  async function run(parallel:boolean){
   const source=new LiveSource({school:'uwaterloo'},{now:new Date('2026-10-10T12:00:00Z')});source.versions={lp:'1.30',le:'1.60'};
   const courses=Array.from({length:6},(_,n)=>({id:String(n+1),orgUnitId:n+1,code:`CS ${135+n}`}));source.courseOrder=courses;
   const paths:string[]=[];
   source.api=async(path:string)=>{paths.push(path);await new Promise(r=>setTimeout(r,100));if(path.includes('/dropbox/folders/'))return [{Id:10,Name:'Assignment 04',DueDate:'2026-10-21T01:00:00Z'}];if(path.includes('/quizzes/'))return [{QuizId:20,Name:'Quiz 1',DueDate:'2026-10-22T01:00:00Z'}];return []};
   source.quizDone=async()=>({submitted:true,at:'2026-10-10T10:00:00Z'});
   const started=Date.now();const promise=parallel?readLearnCourses(source,courses):Promise.all([ (async()=>{const rows=[];for(const c of courses)rows.push({status:'fulfilled',value:await source.listDeadlines(c)});return rows})()]).then(r=>r[0]);
   await vi.runAllTimersAsync();return {rows:await promise,elapsed:Date.now()-started,paths,complete:[...source.readOk]};
  }
  const before=await run(false),after=await run(true);
  expect(after.rows).toEqual(before.rows);expect(after.complete).toEqual(before.complete);
  expect(after.paths.filter(p=>p.includes('content/myItems'))).toHaveLength(4);
  expect(after.paths.filter(p=>p.includes('calendar/events/myEvents'))).toHaveLength(1);
  expect(after.elapsed).toBeLessThan(before.elapsed*0.7);
 }finally{vi.useRealTimers()}
});
