// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {HiddenItems} from '../src/ui/HiddenItems';
import {emptyState,type Entry} from '../src/domain';
it('lists hidden items and restores one or all of them',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const base={course:'CS 135',type:'task' as const,due:'2026-10-27T17:00:00Z',start:null,end:null,status:'open' as const,url:'',platform:'learn' as const};
 const a:Entry={...base,id:'learn:a',title:'A'},b:Entry={...base,id:'learn:b',title:'B'},c:Entry={...base,id:'learn:c',title:'C'};
 const state=emptyState();state.entries=[a,b,c];state.overlays={'learn:a':{hidden:true},'learn:b':{hidden:true}};
 const perform=vi.fn(async()=>null),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<HiddenItems state={state} perform={perform}/>));
  expect(host.querySelectorAll('li')).toHaveLength(2);
  await act(async()=>(host.querySelector('li button') as HTMLButtonElement).click());
  expect(perform).toHaveBeenLastCalledWith('overlay',{id:'learn:a',ids:['learn:a'],patch:{hidden:false}});
  await act(async()=>([...host.querySelectorAll('button')].pop() as HTMLButtonElement).click());
  expect(perform).toHaveBeenLastCalledWith('overlay',{ids:['learn:a','learn:b'],patch:{hidden:false}});
  state.overlays={};await act(async()=>root.render(<HiddenItems state={state} perform={perform}/>));expect(host.innerHTML).toBe('');
 }finally{root.unmount();host.remove()}
});
