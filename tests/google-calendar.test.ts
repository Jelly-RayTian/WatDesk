import {it,expect,vi,beforeEach} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
import {eventForEntry,googleEventId,planSync,desiredEvents} from '../src/core/google-calendar';
const base={platform:'learn' as const,course:'CS 135',type:'task' as const,start:null,end:null,status:'open' as const,url:'https://learn.uwaterloo.ca/d2l/home'};
const task:Entry={...base,id:'learn:1',title:'Assignment 06',due:'2026-11-27T04:59:00Z'};
const exam:Entry={...base,id:'odyssey:1',platform:'odyssey',type:'exam',title:'Midterm',start:'2026-12-01T00:00:00Z',end:'2026-12-01T01:50:00Z',due:null,location:'DC 1350',seat:'B12'};
const dated:Entry={...base,id:'outline:a:five-sources:2026-12-05',platform:'outline',title:'Five Sources',dateOnly:'2026-12-05',due:'2026-12-06T04:59:59Z'};
it('turns entries into Google events without guessing',()=>{
 const t=eventForEntry(task,'America/Toronto')!;
 expect(t.summary).toBe('CS 135 Assignment 06');expect(t.colorId).toMatch(/^([1-9]|1[01])$/);expect(eventForEntry({...task,id:'learn:2',title:'Another'},'America/Toronto')!.colorId).toBe(t.colorId);
 expect(eventForEntry({...task,course:'MATH 135',title:'MATH 135 Quiz 2'},'America/Toronto')!.summary).toBe('MATH 135 Quiz 2');expect(t.start.dateTime).toBe('2026-11-27T04:59:00.000Z');expect(t.end.dateTime).toBe('2026-11-27T05:14:00.000Z');expect(t.reminders).toEqual({useDefault:false});
 expect(t.description).toContain('LEARN');expect(t.description).toContain('https://learn.uwaterloo.ca/d2l/home');expect(t.source?.url).toBe('https://learn.uwaterloo.ca/d2l/home');
 const x=eventForEntry(exam,'America/Toronto')!;expect(x.end.dateTime).toBe('2026-12-01T01:50:00.000Z');expect(x.description).toContain('DC 1350 · Seat B12');
 const d=eventForEntry(dated,'America/Toronto')!;expect(d.start).toEqual({date:'2026-12-05'});expect(d.end).toEqual({date:'2026-12-06'});
 expect(eventForEntry({...task,due:null},'America/Toronto')).toBeNull();
 expect(eventForEntry({...task,url:'javascript:alert(1)'},'America/Toronto')!.source).toBeUndefined();
});
it('derives stable base32hex event ids',async()=>{
 const a=await googleEventId('learn:1');expect(a).toMatch(/^[0-9a-v]{26}$/);expect(await googleEventId('learn:1')).toBe(a);expect(await googleEventId('learn:2')).not.toBe(a);
});
it('plans upserts for new or changed events and deletes for the rest',async()=>{
 const now=Date.parse('2026-11-26T15:00:00Z');const s=emptyState();s.entries=[task,exam,dated,{...task,id:'learn:old',title:'Old',due:'2026-01-01T00:00:00Z'},{...task,id:'learn:gone',title:'Gone',gone:true}];
 s.overlays={'odyssey:1':{hidden:true}};s.settings.outlineEnabled=true;
 const want=await desiredEvents(s,now);
 expect(want).toHaveLength(2);// hidden, gone and far-past items are not mirrored
 const ids=Object.fromEntries(want.map(d=>[d.id,d.hash]));
 const same=planSync(want,ids);expect(same.upserts).toHaveLength(0);expect(same.deletes).toHaveLength(0);
 const changed=planSync(want,{...ids,[want[0].id]:'stale','zzzz':'x'});expect(changed.upserts.map(d=>d.id)).toEqual([want[0].id]);expect(changed.deletes).toEqual(['zzzz']);
});
