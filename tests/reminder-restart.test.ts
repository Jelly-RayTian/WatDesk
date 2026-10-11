import {it,expect} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
import {planReminders} from '../src/core/util';
const exam:Entry={id:'odyssey:test',platform:'odyssey',course:'CS 135',title:'Midterm',type:'exam',start:'2026-11-10T00:00:00Z',end:'2026-11-10T01:50:00Z',due:null,status:'open',url:''};
it('catches up only the most urgent missed reminder when restarting before an exam',()=>{const s=emptyState();s.entries=[exam];const r=planReminders(s,'2026-11-09T23:30:00Z');expect(r).toHaveLength(1);expect(r[0].lead).toBe(60);s.sent[r[0].key]='2026-11-09T23:30:00Z';expect(planReminders(s,'2026-11-09T23:31:00Z')).toHaveLength(0)});
it('does not duplicate equal reminder offsets or send stale advance reminders after an exam starts',()=>{const s=emptyState();s.entries=[exam];s.settings.examLeads=[60,60,1440];expect(planReminders(s,'2026-11-09T23:00:00Z')).toHaveLength(1);expect(planReminders(s,'2026-11-10T00:01:00Z')).toHaveLength(0)});
