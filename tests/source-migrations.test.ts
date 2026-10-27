import {it,expect} from 'vitest';
import {emptyState} from '../src/domain';
import {repairScheduleCache} from '../src/core/source-migrations';
it('repairs the known broken schedule cache once, preserving academic data and the last real success time',()=>{const s=emptyState();s.sources.learn={status:'ok',at:'2026-10-25T23:28:00Z',courseReadAt:{ou42:'2026-10-25T23:28:00Z'},issues:[{course:'ECON 101',tool:'schedule',status:404,code:'not-found',kind:'unavailable'}]};const next=repairScheduleCache(s);expect(next.sources.learn).toMatchObject({status:'idle',at:s.sources.learn.at,scheduleVersion:1,courseReadAt:{}});expect(next.entries).toEqual(s.entries);next.sources.learn.status='ok';expect(repairScheduleCache(next)).toBe(next)});
