// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../src/ui/App';
import {emptyState} from '../src/domain';
import {exportIcs} from '../src/core/util';
it('shows LEARN online quizzes in Exams with their full window, retaining one task and calendar event',async()=>{
 const state=emptyState('zh-CN');state.settings.onboardingComplete=true;state.settings.mobiusEnabled=false;
 state.entries=[{id:'learn:schedule:12:module-7-quiz',platform:'learn',readerCourseId:'12',course:'ECON 101',title:'Module 7 Quiz',type:'task',category:'quiz',start:new Date(Date.now()-86400000).toISOString(),due:new Date(Date.now()+86400000).toISOString(),end:null,status:'open',url:'https://learn.uwaterloo.ca/d2l/le/content/12/viewContent/7/View',seenIn:['course-schedule']},{id:'learn:old',platform:'learn',course:'ECON 101',title:'Module 1 Quiz',category:'quiz',type:'task',start:'2020-09-01T12:00:00Z',end:null,due:'2020-09-03T03:00:00Z',status:'open',url:''}];
 vi.stubGlobal('scrollTo',()=>{});vi.stubGlobal('chrome',{runtime:{sendMessage:async({type}:any)=>({ok:true,value:type==='state'?state:true})},storage:{onChanged:{addListener:()=>{},removeListener:()=>{}}}});vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;location.hash='#exams';
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<App/>));const cards=host.querySelectorAll('.exam-grid .exam-card');expect(cards).toHaveLength(1);expect(cards[0].textContent).toContain('Module 7 Quiz');expect(cards[0].textContent).toContain('开放：');expect(cards[0].textContent).toContain('截止：');expect(cards[0].textContent).not.toContain('座位');expect(host.textContent).not.toContain('检测到时间冲突');
 const tasks=[...host.querySelectorAll('nav button')].find(e=>e.textContent?.includes('任务'));expect(tasks).toBeTruthy();await act(async()=>(tasks as HTMLButtonElement).click());expect([...host.querySelectorAll('.entry-title')].filter(e=>e.textContent==='Module 7 Quiz')).toHaveLength(1);expect(exportIcs(state).match(/UID:learn-schedule-12-module-7-quiz@watdesk.local/g)).toHaveLength(1);
 }finally{await act(async()=>root.unmount());host.remove();location.hash='';vi.unstubAllGlobals()}
});
