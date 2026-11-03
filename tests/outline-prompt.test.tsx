// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi,beforeEach} from 'vitest';
import {OutlinePrompt} from '../src/ui/OutlinePrompt';
import {emptyState} from '../src/domain';
beforeEach(()=>localStorage.clear());
it('offers the outline source once, hides when enabled, not onboarded or dismissed',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const s=emptyState('en');s.settings.onboardingComplete=true;
 const enable=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<OutlinePrompt state={s} enable={enable}/>));
  expect(host.textContent).toContain('course outline');
  await act(async()=>(host.querySelector('.button.primary') as HTMLButtonElement).click());expect(enable).toHaveBeenCalledTimes(1);
  await act(async()=>(host.querySelector('.icon-button') as HTMLButtonElement).click());expect(host.innerHTML).toBe('');expect(localStorage.getItem('watdesk.outlinePromptDismissed')).toBe('1');
  localStorage.clear();await act(async()=>root.render(<OutlinePrompt state={{...s,settings:{...s.settings,outlineEnabled:true}}} enable={enable}/>));expect(host.innerHTML).toBe('');
  await act(async()=>root.render(<OutlinePrompt state={{...s,settings:{...s.settings,onboardingComplete:false}}} enable={enable}/>));expect(host.innerHTML).toBe('');
 }finally{root.unmount();host.remove()}
});
