import {it,expect} from 'vitest';
import {zoneOptions} from '../src/core/zones';
it('lists campus first, keeps the selected zone and offers many searchable zones',()=>{
 const at=new Date('2026-01-15T12:00:00Z');
 const o=zoneOptions('Asia/Tokyo','Waterloo time','Local time',at);
 expect(o[0].value).toBe('Asia/Tokyo');
 expect(o.some(z=>z.value==='America/Toronto'&&z.label.startsWith('Waterloo time'))).toBe(true);
 expect(o.find(z=>z.value==='Asia/Shanghai')?.hint).toBe('UTC+8');
 expect(o.find(z=>z.value==='America/Toronto')?.hint).toBe('UTC-5');
 expect(new Set(o.map(z=>z.value)).size).toBe(o.length);
 expect(o.length).toBeGreaterThan(20);
});
it('drops invalid zone ids instead of throwing',()=>{
 expect(zoneOptions('Not/AZone','c','l').some(z=>z.value==='Not/AZone')).toBe(false);
});
