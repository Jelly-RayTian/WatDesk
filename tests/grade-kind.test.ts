import {it,expect} from 'vitest';
import {gradeKind,gradeKindLabel} from '../src/core/grade-kind';
import {parseLearnGrades} from '../src/adapters/learn-extras';
import {gradeStats} from '../src/adapters/crowdmark-dom';
import type {Entry} from '../src/domain';
it('labels totals and averages without calling final exams a total',()=>{expect(gradeKind({title:'Final Calculated Grade'})).toBe('overall');expect(gradeKind({title:'Assignment Average'})).toBe('average');expect(gradeKind({title:'Class Average'})).toBe('class-average');expect(gradeKind({title:'Final Exam'})).toBe('assessment');expect(gradeKindLabel('overall',true)).toBe('平台总评')});
it('does not count a platform average or total twice in assessment statistics',()=>{const rows=[{title:'A01',scorePercent:80},{title:'A02',scorePercent:100},{title:'Overall Average',scorePercent:90}] as Entry[];expect(gradeStats(rows)).toMatchObject({count:2,average:90})});

it('uses Learn metadata for renamed category aggregates and final totals',()=>{const rows=parseLearnGrades([{GradeObjectIdentifier:'1',GradeObjectName:'Quizzes',GradeObjectType:9,DisplayedGrade:'90%'},{GradeObjectIdentifier:'2',GradeObjectName:'Current result',GradeObjectType:7,DisplayedGrade:'85%'}],'DEMO 100','demo');expect(rows.map(gradeKind)).toEqual(['average','overall']);expect(gradeStats(rows).count).toBe(0)});
