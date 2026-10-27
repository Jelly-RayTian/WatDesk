import {it,expect} from 'vitest';
import {parsePdfSchedule} from '../src/adapters/pdf-schedule';
it('reads explicit assignment deadlines and fixed quizzes across daylight saving time',()=>{
 const text='MATH 135 Fall 2026 Course Schedule Assignment W1 due Wednesday, September 16, 2026 at 4:05 PM Learning Objectives 1 - 3 Quiz W5 on October 28, 2026 from 4:00 – 5:20 PM Quiz W6 on November 4, 2026 from 4:00 – 5:20 PM Midterm on Wednesday, October 21, 2026 from 7:00 – 8:50 PM Final Exam (Date to be determined)';
 const items=parsePdfSchedule(text,'MATH 135','1288715','6581845');expect(items).toHaveLength(5);
 expect(items[0]).toMatchObject({title:'W1',category:'assignment',type:'task',due:'2026-09-16T20:05:00Z'});
 expect(items[1]).toMatchObject({title:'Quiz W5',type:'exam',start:'2026-10-28T20:00:00Z',end:'2026-10-28T21:20:00Z'});
 expect(items[2]).toMatchObject({title:'Quiz W6',type:'exam',start:'2026-11-04T21:00:00Z',end:'2026-11-04T22:20:00Z'});
 expect(items[3]).toMatchObject({title:'Midterm',start:'2026-10-21T23:00:00Z',end:'2026-10-22T00:50:00Z'});
 expect(items[4]).toMatchObject({title:'Final Exam',type:'exam',start:null,end:null,due:null});
});
it('does not infer an AM/PM boundary or time from surrounding lecture dates',()=>{
 expect(parsePdfSchedule('Extra lecture September 16, 2026 from 4:00 - 5:20 PM Quiz W5 on October 28, 2026 from 11:00 - 1:00 PM','MATH 135','42','7')).toEqual([]);
});
