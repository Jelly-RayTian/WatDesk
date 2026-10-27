import {it,expect} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
import {visibleEntries} from '../src/core/state';
import {exportIcs} from '../src/core/util';
it('keeps Odyssey room and seat and one calendar item when a PDF exam has the same precise interval',()=>{
 const s=emptyState();const pdf:Entry={id:'learn:pdf',platform:'learn',course:'MATH 135',title:'Quiz W5',type:'exam',start:'2026-10-28T20:00:00Z',end:'2026-10-28T21:20:00Z',due:null,status:'open',url:'',seenIn:['pdf-schedule']};
 s.entries=[pdf,{...pdf,id:'odyssey:exam',platform:'odyssey',title:'MATH 135 Quiz 2',location:'DC 1350',seat:'A1',seenIn:[]}];
 expect(visibleEntries(s)).toHaveLength(1);expect(visibleEntries(s)[0]).toMatchObject({id:'odyssey:exam',location:'DC 1350',seat:'A1',mergedIds:['odyssey:exam','learn:pdf']});
 expect(exportIcs(s).match(/BEGIN:VEVENT/g)).toHaveLength(1);
 s.overlays[pdf.id]={keepSeparate:true};expect(visibleEntries(s)).toHaveLength(2);
});
it('keeps conflicting intervals and ambiguous same-source exams separate',()=>{
 const s=emptyState();const pdf:Entry={id:'learn:pdf',platform:'learn',course:'MATH 135',title:'Quiz W5',type:'exam',start:'2026-10-28T20:00:00Z',end:'2026-10-28T21:20:00Z',due:null,status:'open',url:'',seenIn:['pdf-schedule']};
 s.entries=[pdf,{...pdf,id:'odyssey:exam',platform:'odyssey',end:'2026-10-28T22:00:00Z'}];expect(visibleEntries(s)).toHaveLength(2);
 s.entries=[pdf,{...pdf,id:'learn:second'}, {...pdf,id:'odyssey:exam',platform:'odyssey'}];expect(visibleEntries(s)).toHaveLength(3);
});
