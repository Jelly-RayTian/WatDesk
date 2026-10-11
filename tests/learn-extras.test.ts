import {it,expect} from 'vitest';
import {parseLearnGrades,parseLearnExams} from '../src/adapters/learn-extras';
import {emptyState} from '../src/domain';
import {enabledPlatforms} from '../src/core/onboarding';
import {visibleEntries} from '../src/core/state';
import {recoverInterrupted} from '../src/core/sync';
it('reads released percentages, numeric zero, and text grades without exposing hidden points',()=>{
 const rows=parseLearnGrades([{GradeObjectIdentifier:'1',GradeObjectName:'Quiz 1',DisplayedGrade:'8 / 10',PointsNumerator:8,PointsDenominator:10},{GradeObjectIdentifier:'2',GradeObjectName:'Quiz 2',DisplayedGrade:'0%',PointsNumerator:0,PointsDenominator:10},{GradeObjectIdentifier:'3',GradeObjectName:'Hidden',DisplayedGrade:'',PointsNumerator:9,PointsDenominator:10},{GradeObjectIdentifier:'4',GradeObjectName:'Participation',DisplayedGrade:'Pass'}],'CS 135','100');
 expect(rows.map(r=>r.scorePercent)).toEqual([80,0,undefined,undefined]);expect(rows[3].gradeText).toBe('Pass');expect(rows.every(r=>r.gradeOnly)).toBe(true);
 const s=emptyState();s.entries=rows;expect(visibleEntries(s)).toHaveLength(0);
});
it('only uses explicit calendar exam times, excluding reviews, quiz deadlines and all-day dates',()=>{
 const base={OrgUnitId:100,CalendarEventId:1,Title:'Midterm 1',StartDateTime:'2026-10-21T23:00:00Z',EndDateTime:'2026-10-22T01:00:00Z'};
 const rows=parseLearnExams([base,{...base,CalendarEventId:2,Title:'Midterm review'},{...base,CalendarEventId:3,Title:'Final exam',IsAllDayEvent:true},{...base,CalendarEventId:4,AssociatedEntity:{AssociatedEntityId:33}},{...base,CalendarEventId:5,StartDateTime:null}],[{id:'100',orgUnitId:100,code:'CS 135'}]);
 expect(rows).toHaveLength(1);expect(rows[0].start).toBe('2026-10-21T23:00:00.000Z');expect(rows[0].platform).toBe('learn');
});
it('makes CS135 opt-in and hides disabled website records',()=>{
 const s=emptyState();expect(enabledPlatforms(s)).toEqual(['learn','crowdmark','odyssey']);s.entries=[{id:'cs135:1',platform:'cs135',course:'CS 135',title:'A04',type:'task',status:'open',start:null,end:null,due:null,url:''}];expect(visibleEntries(s)).toHaveLength(0);s.settings.cs135Enabled=true;expect(enabledPlatforms(s)).toHaveLength(4);expect(visibleEntries(s)).toHaveLength(1);
});
it('recovers a persisted queue and grade-reading phase after the panel or worker closes',()=>{
 const s=emptyState();s.syncRun={started:1,targets:['learn','crowdmark'],completed:['learn'],active:'crowdmark',finished:false};s.sources.crowdmark={status:'ok',phase:'grades',at:'2026-10-10T12:00:00Z'};const next=recoverInterrupted(s);expect(next.syncRun).toMatchObject({finished:true,failed:'crowdmark',active:undefined});expect(next.sources.crowdmark).toMatchObject({status:'error',phase:undefined,error:'sync-interrupted',at:s.sources.crowdmark.at});
});
