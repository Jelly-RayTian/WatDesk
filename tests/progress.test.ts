import {it,expect} from 'vitest';
import {syncReadStatus} from '../src/core/progress';
const started=Date.parse('2026-10-10T12:00:00Z');
it('does not count cached success as this opening having completed',()=>{expect(syncReadStatus({status:'ok',at:'2026-10-09T12:00:00Z'},started,false)).toBe('reading');expect(syncReadStatus({status:'ok',attempt:'2026-10-09T12:00:00Z'},started,false)).toBe('reading')});
it('tracks fresh completions and failures separately from pending readers',()=>{const attempt='2026-10-10T12:00:00Z';expect(syncReadStatus({status:'syncing',attempt},started,false)).toBe('reading');expect(syncReadStatus({status:'ok',attempt},started,false)).toBe('done');expect(syncReadStatus({status:'error',attempt},started,false)).toBe('error')});
it('reports errors instead of inventing success for missing or failed sources',()=>{expect(syncReadStatus(undefined,started,true)).toBe('error');expect(syncReadStatus({status:'error'},started,true)).toBe('error');expect(syncReadStatus({status:'ok'},started,true)).toBe('done')});
