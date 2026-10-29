import {it,expect} from 'vitest';
import type {Entry} from '../src/domain';
import {buildWorkload} from '../src/core/workload';
const e=(id:string,type:Entry['type']):Entry=>({id,platform:'learn',course:'MATH 135',title:id,type,start:null,end:null,due:null,status:'open',url:''});
it('weights exams heavier than tasks and finds the busiest day',()=>{
 const w=buildWorkload([{day:'2026-11-02',entries:[e('a','task')]},{day:'2026-11-04',entries:[e('b','exam'),e('c','task'),e('d','task')]}],'2026-11-01');
 expect(w.rows).toHaveLength(14);
 expect(w.rows[0].day).toBe('2026-11-01');expect(w.rows[0].level).toBe(0);
 expect(w.rows[1]).toMatchObject({tasks:1,exams:0,load:1,level:1});
 expect(w.rows[3]).toMatchObject({tasks:2,exams:1,load:5,level:3});
 expect(w.peak?.day).toBe('2026-11-04');expect(w.week).toBe(4);expect(w.nextWeek).toBe(0);
});
it('counts next week separately and returns no peak for an empty fortnight',()=>{
 const w=buildWorkload([{day:'2026-11-10',entries:[e('a','task'),e('b','task')]}],'2026-11-01');
 expect(w.week).toBe(0);expect(w.nextWeek).toBe(2);
 expect(buildWorkload([],'2026-11-01').peak).toBeNull();
});
it('rolls across month boundaries in campus-day strings',()=>{
 const w=buildWorkload([],'2026-12-30');expect(w.rows[3].day).toBe('2027-01-02');
});
