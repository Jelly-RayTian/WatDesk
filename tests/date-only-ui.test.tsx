// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {App} from '../src/ui/App';
import {emptyState,type Entry} from '../src/domain';
it.each([['Asia/Shanghai','2026-11-03T01:00:00Z'],['Pacific/Honolulu','2026-11-04T08:00:00Z']])('preserves literal outline dates across overview, exams and calendar in %s',async(zone,now)=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(now));
 const state=emptyState('zh-CN');state.settings.onboardingComplete=true;state.settings.zone=zone;
 const item:Entry={id:'outline:task',platform:'manual',course:'ENGL 119',title:'Proposal',type:'task',dateOnly:'2026-11-03',due:'2026-11-04T04:59:59Z',start:null,end:null,status:'open',url:''};
 state.entries=[item,{...item,id:'outline:exam',type:'exam',title:'Date-only Exam',due:null,start:item.due}];
 vi.stubGlobal('chrome',{runtime:{sendMessage:async({type}:any)=>({ok:true,value:type==='state'?state:true})},storage:{onChanged:{addListener:()=>{},removeListener:()=>{}}}});vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));vi.stubGlobal('scrollTo',()=>{});(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;location.hash='#overview';
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<App/>));expect(host.querySelector('.entry-date')?.textContent).toContain('11月3日');expect(host.querySelector('.next-assessment')?.textContent).toContain('11月3日');expect(host.querySelector('.agenda-items .exam-time')?.textContent).toContain('11月3日');
 const exams=[...host.querySelectorAll('nav button')].find(e=>e.textContent==='考试') as HTMLButtonElement;await act(async()=>exams.click());expect(host.querySelector('.exam-grid')?.textContent).toContain('Date-only Exam');expect(host.querySelector('.exam-grid')?.textContent).toContain('11月3日');
 const calendar=[...host.querySelectorAll('nav button')].find(e=>e.textContent==='日历') as HTMLButtonElement;await act(async()=>calendar.click());expect(host.querySelectorAll('.calendar-agenda .agenda-row')).toHaveLength(2);expect(host.querySelector('.calendar-agenda')?.textContent).not.toContain('11月4日');expect(host.querySelector('.calendar-agenda')?.textContent).not.toContain('12:59');
 }finally{await act(async()=>root.unmount());host.remove();location.hash='';vi.unstubAllGlobals();vi.useRealTimers()}
});
