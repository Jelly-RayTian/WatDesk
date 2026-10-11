// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://app.crowdmark.com/sign-in/waterloo"}
import {it,expect,afterEach,vi} from 'vitest';
import {autoLogin,clickPlatformLogin} from '../src/adapters/login';
afterEach(()=>{document.body.innerHTML='';history.replaceState(null,'','/sign-in/waterloo')});
it('clicks only the institution LEARN sign-in entry',async()=>{
 document.body.innerHTML='<a href="/auth/institution">Sign in with LEARN</a><a href="/sign-in?force_form=true">Sign in with email</a>';
 const clicked=vi.fn();document.querySelector('a')!.addEventListener('click',e=>{e.preventDefault();clicked()});
 expect(await clickPlatformLogin('crowdmark')).toBe('started');expect(clicked).toHaveBeenCalledTimes(1);
});
it('uses the Waterloo institution entry instead of the generic email login page',async()=>{history.replaceState(null,'','/sign-in');expect(await clickPlatformLogin('crowdmark')).toBe('waterloo-entry')});
it('leaves passwords and verification forms for the user',async()=>{
 document.body.innerHTML='<input type="password" value="test"><a href="/auth/institution">Sign in with LEARN</a>';
 const clicked=vi.fn();document.querySelector('a')!.addEventListener('click',e=>{e.preventDefault();clicked()});expect(await clickPlatformLogin('crowdmark')).toBe('manual-login');expect(clicked).not.toHaveBeenCalled();
});
it('does not click unrelated login controls on a signed-in course page or another platform',async()=>{history.replaceState(null,'','/student/courses');expect(await clickPlatformLogin('crowdmark')).toBe('ready');expect(await clickPlatformLogin('learn')).toBe('outside-platform')});

it('recognizes an institution sign-in button despite nested icons and spacing',async()=>{
 document.body.innerHTML='<button><span aria-hidden="true">→</span><span>Sign in with LEARN</span></button>';
 const clicked=vi.fn();document.querySelector('button')!.addEventListener('click',clicked);
 expect(await clickPlatformLogin('crowdmark')).toBe('started');expect(clicked).toHaveBeenCalledTimes(1);
});
it('chooses the Waterloo SSO entry even when an email login form is also present',async()=>{
 history.replaceState(null,'','/sign-in');document.body.innerHTML='<input autocomplete="username"><input type="password">';
 expect(await clickPlatformLogin('crowdmark')).toBe('waterloo-entry');
});

it('does not repeatedly click a pending login entry',async()=>{
 document.body.innerHTML='<a href="/auth/institution">Sign in with LEARN</a>';const clicked=vi.fn();document.querySelector('a')!.addEventListener('click',e=>{e.preventDefault();clicked()});
 expect(await clickPlatformLogin('crowdmark')).toBe('started');expect(await clickPlatformLogin('crowdmark')).toBe('waiting-login');expect(clicked).toHaveBeenCalledTimes(1);
});
it('waits across SSO redirects before considering the platform ready and shares concurrent attempts',async()=>{
 vi.useFakeTimers();const execute=vi.fn().mockResolvedValueOnce([{result:'started'}]).mockResolvedValueOnce([{result:'outside-platform'}]).mockResolvedValueOnce([{result:'ready'}]);vi.stubGlobal('chrome',{tabs:{get:async()=>({status:'complete',url:'https://app.crowdmark.com/student/courses'})},scripting:{executeScript:execute}});
 try{const first=autoLogin('crowdmark',90),second=autoLogin('crowdmark',90);expect(first).toBe(second);await vi.runAllTimersAsync();await first;expect(execute).toHaveBeenCalledTimes(3)}finally{vi.useRealTimers();vi.unstubAllGlobals()}
});
it('stops with a clear sign-in-required error when human verification is needed',async()=>{
 vi.stubGlobal('chrome',{tabs:{get:async()=>({status:'complete'})},scripting:{executeScript:async()=>[{result:'manual-login'}]}});try{await expect(autoLogin('learn',91)).rejects.toThrow('sign-in-required')}finally{vi.unstubAllGlobals()}
});
