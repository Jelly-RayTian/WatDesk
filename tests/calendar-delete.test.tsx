// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {Calendar} from '../src/ui/Calendar';
import {emptyState,type Entry} from '../src/domain';
it('removes personal and synced items from the calendar agenda and restores hidden ones',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-27T16:00:00Z'));
 vi.spyOn(window,'confirm').mockReturnValue(true);
 const state=emptyState();const base={course:'CS 135',type:'task' as const,due:'2026-10-27T17:00:00Z',start:null,end:null,status:'open' as const,url:''};
 const mine:Entry={...base,id:'manual:one',platform:'manual',title:'Mine'},synced:Entry={...base,id:'learn:two',platform:'learn',title:'Synced'},gone:Entry={...base,id:'learn:three',platform:'learn',title:'Hidden'};
 state.entries=[mine,synced,gone];state.overlays={'learn:three':{hidden:true}};
 const del=vi.fn(),restore=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<Calendar state={state} entries={[mine,synced]} zone="America/Toronto" locale="en" t={k=>k} colors={{}} onAdd={()=>{}} onEntry={()=>{}} onDelete={del} onRestore={restore}/>));
  const buttons=[...host.querySelectorAll<HTMLButtonElement>('.agenda-delete')];expect(buttons).toHaveLength(2);
  await act(async()=>buttons[0].click());await act(async()=>buttons[1].click());
  expect(del.mock.calls.map(c=>c[0].id)).toEqual(['manual:one','learn:two']);
  await act(async()=>([...host.querySelectorAll('.calendar-restore button')][0] as HTMLButtonElement).click());expect(restore).toHaveBeenCalledWith(['learn:three']);
 }finally{root.unmount();host.remove();vi.useRealTimers();vi.restoreAllMocks()}
});
