// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {Calendar} from '../src/ui/Calendar';
import {emptyState,type Entry} from '../src/domain';
it('double-clicks a day to add with that date in month and week views, without adding from existing events',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-27T16:00:00Z'));
 const state=emptyState();const entry:Entry={id:'manual:one',platform:'manual',course:'CS 135',title:'Existing item',type:'task',due:'2026-10-27T17:00:00Z',start:null,end:null,status:'open',url:''};state.entries=[entry];
 const add=vi.fn(),open=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const render=()=>root.render(<Calendar state={state} entries={state.entries} zone="America/Toronto" locale="en" t={k=>k} colors={{}} onAdd={add} onEntry={open}/>);
 const dbl=(el:Element)=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 try{
  await act(async()=>render());
  const today=host.querySelector('.calendar-day.is-today')!;await act(async()=>dbl(today.querySelector('.calendar-cell-events')!));expect(add).toHaveBeenLastCalledWith('2026-10-27');
  const outside=host.querySelector('.calendar-day.outside')!;await act(async()=>(outside.querySelector('.calendar-date') as HTMLButtonElement).click());expect(host.querySelector('.calendar-toolbar h2')?.textContent).toContain('October');await act(async()=>dbl(outside.querySelector('.calendar-date')!));expect(add).toHaveBeenLastCalledWith('2026-09-28');
  await act(async()=>{([...host.querySelectorAll('button')].find(e=>e.textContent==='Today') as HTMLButtonElement).click()});
  const event=host.querySelector('.calendar-event')!;const before=add.mock.calls.length;await act(async()=>{event.dispatchEvent(new MouseEvent('click',{bubbles:true}));dbl(event)});expect(open).toHaveBeenCalledWith(entry);expect(add).toHaveBeenCalledTimes(before);
  const week=[...host.querySelectorAll('.calendar-view-switch button')].find(e=>e.textContent==='weekView') as HTMLButtonElement;await act(async()=>week.click());
  const cell=host.querySelector('.calendar-grid.week .calendar-day')!;await act(async()=>dbl(cell));expect(add).toHaveBeenLastCalledWith('2026-10-26');
 }finally{await act(async()=>root.unmount());host.remove();vi.useRealTimers()}
});
