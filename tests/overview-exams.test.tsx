// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../src/ui/App';
import {emptyState} from '../src/domain';
it('shows Odyssey exams in overview upcoming items and course counts',async()=>{
 const state=emptyState('zh-CN');state.settings.onboardingComplete=true;
 for(const [i,course] of ['MATH 137','MATH 135'].entries())state.entries.push({id:'exam:'+i,platform:'odyssey',course,title:course+' Midterm',type:'exam',start:new Date(Date.now()+(i+1)*86400000).toISOString(),end:null,due:null,status:'open',url:''});
 vi.stubGlobal('chrome',{runtime:{sendMessage:async({type}:any)=>({ok:true,value:type==='state'?state:true})},storage:{onChanged:{addListener:()=>{},removeListener:()=>{}}}});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>{root.render(<App/>)});
 const cards=[...host.querySelectorAll('.task-section .exam-card')];expect(cards).toHaveLength(2);
 expect(cards.map(e=>e.textContent).join(' ')).toContain('MATH 135 Midterm');
 const filters=[...host.querySelectorAll('.course-filters button')];expect(filters.find(e=>e.textContent?.includes('MATH 137'))?.querySelector('b')?.textContent).toBe('1');
 await act(async()=>{(filters.find(e=>e.textContent?.includes('MATH 135')) as HTMLButtonElement).click()});
 expect(host.querySelectorAll('.task-section .exam-card')).toHaveLength(1);expect(host.querySelector('.task-section')?.textContent).not.toContain('MATH 137 Midterm');
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals()}
});
