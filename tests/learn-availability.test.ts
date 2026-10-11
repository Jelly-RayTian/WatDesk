import {it,expect} from 'vitest';
import {learnIssue,toolIssues,readLearnGradeBatch,formatLearnIssue} from '../src/adapters/learn-availability';
import type {Entry} from '../src/domain';
const courses=[{id:'1',orgUnitId:1,code:'MATH 135'},{id:'2',orgUnitId:2,code:'MATH 137'}];
const old={id:'learn:grade:old',platform:'learn',readerCourseId:'1',gradeOnly:true,course:'MATH 135',title:'Old score'} as Entry;
it('treats restricted and absent grade endpoints as availability notices, retaining saved scores',async()=>{
 const result=await readLearnGradeBatch({versions:{le:'1.82'},paged:async()=>{throw Object.assign(Error('restricted'),{code:'forbidden',status:403})}},courses,[old]);
 expect(result.entries).toEqual([{...old,readState:'retained'}]);expect(result.issues).toHaveLength(2);expect(result.issues[0]).toMatchObject({course:'MATH 135',tool:'grades',kind:'unavailable',code:'forbidden',status:403});expect(result.retry).toBe(false);
});
it('does not disguise network and rate-limit failures as unreleased grades',async()=>{
 const result=await readLearnGradeBatch({versions:{le:'1.82'},paged:async(path:string)=>{if(path.includes('/1/'))throw Object.assign(Error('request'),{code:'http',status:429});return []}},courses,[old]);
 expect(result.entries).toEqual([{...old,readState:'retained'}]);expect(result.retry).toBe(true);expect(result.issues[0]).toMatchObject({kind:'failed',status:429});
});
it('propagates expired sessions for automatic sign-in recovery',async()=>{
 await expect(readLearnGradeBatch({versions:{le:'1.82'},paged:async()=>{throw Object.assign(Error('expired'),{code:'signed-out',status:401})}},courses,[old])).rejects.toThrow('signed-out');
});
it('reports actual course tool outcomes instead of treating every missing tool as a read failure',()=>{
 const issues=toolIssues([{code:'MATH 135',tools:{dropbox:2,quizzes:'failed: forbidden',discussions:'failed: network',myItems:0,calendar:0},discussionsPartial:0}]);
 expect(issues.map(i=>i.kind)).toEqual(['unavailable','failed']);expect(issues.map(i=>i.tool)).toEqual(['quizzes','discussions']);
 expect(toolIssues([{code:'CS 135',tools:{dropbox:0,quizzes:0,discussions:0,myItems:0,calendar:0}}])).toEqual([]);
});
it('localizes availability without claiming the instructor has not released grades',()=>{
 const issue=learnIssue('MATH 135','grades',{code:'not-found',status:404});
 expect(formatLearnIssue(issue,true)).toContain('HTTP 404');expect(formatLearnIssue(issue,false)).toContain('MATH 135');expect(formatLearnIssue(issue,true)).not.toContain('未公布');
});
