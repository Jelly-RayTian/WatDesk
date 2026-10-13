import {describe,it,expect} from 'vitest';
import {parseMobiusSettings,mergeMobiusSnapshot} from '../src/adapters/mobius';
import {parseScheduleRows} from '../src/adapters/learn-schedule';
import {emptyState} from '../src/domain';
import {visibleEntries} from '../src/core/state';
import {exportIcs,planReminders,validateBackup} from '../src/core/util';
const settings={course:'ECON 101 Online - Fall 2026 - 081',title:'Module 6 Quiz',rows:[['Time Limit','20 minutes'],['Maximum Attempts','1 (0 used)'],['Date','Start 2026/10/21 EDT 8:00:00 AM End 2026/10/23 EDT 11:00:00 PM']]};
describe('Möbius settings metadata',()=>{
 it('keeps the access window separate from the attempt duration',()=>{const e=parseMobiusSettings(settings)!;expect(e.course).toBe('ECON 101');expect(e.due).toBe('2026-10-24T03:00:00Z');expect(e.start).toBe('2026-10-21T12:00:00Z');expect(e.duration).toBe('20 minutes');expect(e.type).toBe('task');expect(e.status).toBe('open')});
 it('does not infer completion from attempts or viewed content',()=>{expect(parseMobiusSettings({...settings,rows:[...settings.rows,['Maximum Attempts','1 (1 used)'],['Completion','You have viewed this topic']]})?.status).toBe('open');expect(parseMobiusSettings({...settings,rows:[...settings.rows,['Status','Submitted']]})?.status).toBe('submitted')});
 it('supports Chinese dates and rejects incomplete or ambiguous metadata',()=>{expect(parseMobiusSettings({...settings,rows:[['日期','开始 2026/10/21 EDT 上午8:00:00 结束 2026/10/23 EDT 下午11:00:00'],['时间限制','20 分钟']]})?.due).toBe('2026-10-24T03:00:00Z');expect(parseMobiusSettings({...settings,course:'Unknown'})).toBeNull();expect(parseMobiusSettings({...settings,rows:[]})).toBeNull()});
 it('retains previously seen settings when another quiz is read',()=>{const a=parseMobiusSettings(settings)!;const b={...a,id:a.id+'other',title:'Module 7 Quiz'};expect(mergeMobiusSnapshot([a],[b])).toHaveLength(2)});
 it('deduplicates with LEARN while retaining the time limit and shared reminders',()=>{const e=parseMobiusSettings(settings)!;const s=emptyState();s.settings.mobiusEnabled=true;s.entries=[{...e,id:'learn:quiz',platform:'learn',duration:undefined},e];const merged=visibleEntries(s);expect(merged).toHaveLength(1);expect(merged[0].duration).toBe('20 minutes');expect(planReminders(s,'2026-10-23T03:01:00Z')).toHaveLength(1);expect(exportIcs(s).match(/BEGIN:VEVENT/g)).toHaveLength(1);expect(validateBackup(JSON.stringify(s))).toEqual(s);s.settings.mobiusEnabled=false;expect(visibleEntries(s)).toHaveLength(1)});
});
describe('LEARN course schedule quiz dates',()=>{
 it('reads short rowspan continuation rows and handles the DST boundary',()=>{const rows=[['Module','Recommended Readings','Activities and Assessments','Available Date','Due Date','Weight'],['Module 6','Chapter 8','Midterm 1','Tuesday, October 20, 2026 at 12:01 AM','Tuesday, October 20, 2026 at 11:59 PM','20%'],['Module 6 Quiz','Wednesday, October 21, 2026 at 8:00 AM','Friday, October 23, 2026 at 11:00 PM','1%'],['Module 8','Chapter 10','Module 8 Quiz','Wednesday, November 4, 2026 at 8:00 AM','Friday, November 6, 2026 at 11:00 PM','1%']];const es=parseScheduleRows(rows,'ECON 101','1285764','99');expect(es).toHaveLength(2);expect(es[0].due).toBe('2026-10-24T03:00:00Z');expect(es[1].due).toBe('2026-11-07T04:00:00Z');expect(es.every(e=>e.status==='open')).toBe(true)});
 it('leaves missing start dates unknown and skips undated or malformed rows',()=>{const es=parseScheduleRows([['Activities and Assessments','Available Date','Due Date','Weight'],['Module 1 Quiz','','Friday, September 11, 2026 at 11:00 PM','Ungraded'],['Final Exam','','','50%'],['Module 2 Quiz','','Friday, September 18, 2026','1%']],'ECON 101','1','2');expect(es).toHaveLength(1);expect(es[0].start).toBeNull()});
});
it('supports other dated Möbius activities without turning an access window into an exam',()=>{
 const e=parseMobiusSettings({...settings,title:'Assignment 3'});expect(e?.title).toBe('Assignment 3');expect(e?.category).toBe('assignment');expect(e?.type).toBe('task');
});
