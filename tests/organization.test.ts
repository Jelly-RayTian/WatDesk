import {it,expect} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
import {visibleEntries,applySnapshot} from '../src/core/state';
import {estimateGrade,personallyDone,examCountdown,pendingExamChanges} from '../src/core/organization';
import {planReminders,validateBackup} from '../src/core/util';
const task:Entry={id:'learn:1',platform:'learn',course:'CS 135',title:'Assignment 04',type:'task',due:'2026-10-20T01:00:00Z',start:null,end:null,status:'open',url:''};
it('combines numbered assignments only when the course and exact deadline match, preserves submission',()=>{
 const s=emptyState();s.settings.cs135Enabled=true;s.entries=[task,{...task,id:'cs135:4',platform:'cs135',title:'A04'},{...task,id:'crowdmark:4',platform:'crowdmark',status:'submitted'}];
 const list=visibleEntries(s);expect(list).toHaveLength(1);expect(list[0].status).toBe('submitted');expect(list[0].mergedIds).toHaveLength(3);expect(s.entries).toHaveLength(3);
 s.entries[1].due='2026-10-21T01:00:00Z';expect(visibleEntries(s)).toHaveLength(2);
});
it('does not combine ambiguous assessments from the same source and permits opting out',()=>{
 const s=emptyState();s.entries=[task,{...task,id:'crowdmark:4',platform:'crowdmark'},{...task,id:'learn:2'}];expect(visibleEntries(s)).toHaveLength(3);s.entries.pop();s.overlays[task.id]={keepSeparate:true};expect(visibleEntries(s)).toHaveLength(2);
});
it('personal completion survives a representative source changing and remains separate from submission',()=>{
 const s=emptyState();s.entries=[task,{...task,id:'crowdmark:4',platform:'crowdmark'}];s.overlays['crowdmark:4']={done:true};const e=visibleEntries(s)[0];expect(personallyDone(e,s)).toBe(true);expect(e.status).toBe('open');expect(planReminders(s,'2026-10-19T01:00:10Z')).toHaveLength(0);
});
it('hidden courses disappear from tasks and reminders while original data remains',()=>{
 const s=emptyState();s.entries=[task];s.settings.hiddenCourses=['CS 135'];expect(visibleEntries(s)).toHaveLength(0);expect(planReminders(s,'2026-10-19T01:00:10Z')).toHaveLength(0);expect(s.entries).toHaveLength(1);s.settings.hiddenCourses=[];expect(visibleEntries(s)).toHaveLength(1);
});
it('estimates graded average and target without assigning zero to unreleased grades',()=>{
 const entries=[{...task,scorePercent:80},{...task,id:'learn:2'}];const result=estimateGrade(entries,{weights:{'learn:1':40,'learn:2':60},target:86});expect(result.current).toBe(80);expect(result.earned).toBe(32);expect(result.required).toBe(90);expect(result.completedWeight).toBe(40);
 expect(estimateGrade(entries,{weights:{},target:80}).current).toBeNull();expect(estimateGrade(entries,{weights:{'learn:1':80,'learn:2':60}}).valid).toBe(false);
});
it('handles completed weighting and impossible targets without division by zero',()=>{
 expect(estimateGrade([{...task,scorePercent:80}],{weights:{'learn:1':100},target:90}).required).toBeNull();expect(estimateGrade([{...task,scorePercent:20}],{weights:{'learn:1':90},target:90}).required).toBeGreaterThan(100);
});
it('reports exam countdown and running state',()=>{
 const e={...task,type:'exam' as const,start:'2026-10-20T00:00:00Z',end:'2026-10-20T02:00:00Z'};expect(examCountdown(e,Date.parse('2026-10-19T22:30:00Z'),true)).toBe('1 小时 30 分钟后');expect(examCountdown(e,Date.parse('2026-10-20T01:00:00Z'),false)).toBe('In progress');
});
it('alerts only changes to existing exams, deduplicates reminders and honors hidden courses',()=>{
 const e={...task,id:'odyssey:e',platform:'odyssey' as const,type:'exam' as const,due:null,start:'2099-10-20T01:00:00Z',end:'2099-10-20T03:00:00Z',location:'MC',seat:'1'};let s=emptyState();s.entries=[e];s=applySnapshot(s,'odyssey',[{...e,location:'DC',seat:'2'}],[],{status:'ok'});expect(s.changes[0].kind).toBe('exam');const pending=pendingExamChanges(s);expect(pending).toHaveLength(1);s.sent[pending[0].key]=new Date().toISOString();expect(pendingExamChanges(s)).toHaveLength(0);s.sent={};s.settings.hiddenCourses=['CS 135'];expect(pendingExamChanges(s)).toHaveLength(0);
});
it('validates user-entered weights and course visibility in backups',()=>{
 const s=emptyState();s.settings.hiddenCourses=['CS 135'];s.settings.gradePlans={'learn:1':{weights:{x:40},target:80}};expect(validateBackup(JSON.stringify(s)).settings.gradePlans).toEqual(s.settings.gradePlans);s.settings.gradePlans['learn:1'].weights.x=NaN;expect(()=>validateBackup(JSON.stringify(s))).toThrow();
});
