import {it,expect} from 'vitest';
import {canReuseSource,hasSavedData} from '../src/core/refresh-policy';
import {emptyState} from '../src/domain';
it('uses per-platform freshness windows and manual refresh bypasses them',()=>{
 const now=Date.parse('2026-10-11T12:00:00Z'),s={status:'ok' as const,at:'2026-10-11T11:57:00Z'};
 expect(canReuseSource('learn',s,false,now)).toBe(false);expect(canReuseSource('crowdmark',s,false,now)).toBe(false);expect(canReuseSource('odyssey',s,false,now)).toBe(true);expect(canReuseSource('cs135',s,false,now)).toBe(true);expect(canReuseSource('cs135',s,true,now)).toBe(false);
 expect(canReuseSource('cs135',{...s,at:'2026-10-11T11:30:00Z'},false,now)).toBe(false);
});
it('never caches failed, interrupted, warning, future or invalid results',()=>{
 const now=Date.parse('2026-10-11T12:00:00Z');for(const s of [{status:'error',at:'2026-10-11T11:59:00Z'},{status:'ok',at:'2026-10-11T11:59:00Z',phase:'grades'},{status:'ok',at:'2026-10-11T11:59:00Z',error:'partial'},{status:'ok',at:'2026-10-11T12:01:00Z'},{status:'ok',at:'bad'}] as const)expect(canReuseSource('learn',s,false,now)).toBe(false);
});
it('shows saved data even when the latest attempt failed or a successful result was empty',()=>{
 const s=emptyState();expect(hasSavedData(s)).toBe(false);s.sources.learn={status:'error',at:'2026-10-11T11:59:00Z'};expect(hasSavedData(s)).toBe(true);
});
