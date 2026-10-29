import {it,expect} from 'vitest';
import type {Entry} from '../src/domain';
import {examConflicts} from '../src/core/util';
const exam=(id:string,course:string,title:string,start:string,end:string):Entry=>({id,platform:'learn',course,title,type:'exam',start,end,due:null,status:'open',url:''});
it('does not report one course\'s duplicate listings of the same sitting as a conflict',()=>{
 const a=exam('1','MATH 135','Quiz 1','2026-11-05T14:00:00Z','2026-11-05T15:00:00Z');
 const b=exam('2','MATH135','Quiz W4','2026-11-05T14:00:00Z','2026-11-05T15:00:00Z');
 const c=exam('3','CS 135','CS 135 Midterm exam','2026-11-06T14:00:00Z','2026-11-06T16:00:00Z');
 const d=exam('4','CS 135','CS 135 Midterm','2026-11-06T14:00:00Z','2026-11-06T16:00:00Z');
 expect(examConflicts([a,b,c,d])).toEqual([]);
});
it('still reports overlapping exams from different courses',()=>{
 const a=exam('1','MATH 135','Midterm','2026-11-05T14:00:00Z','2026-11-05T16:00:00Z');
 const b=exam('2','CS 135','Midterm','2026-11-05T15:00:00Z','2026-11-05T17:00:00Z');
 expect(examConflicts([a,b])).toHaveLength(1);
});
it('treats identical windows with a missing course as one sitting',()=>{
 const a=exam('1','MATH 135','Quiz 1','2026-11-05T14:00:00Z','2026-11-05T15:00:00Z');
 const b=exam('2','','Quiz W4','2026-11-05T14:00:00Z','2026-11-05T15:00:00Z');
 expect(examConflicts([a,b])).toEqual([]);
});
