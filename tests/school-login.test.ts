import {afterEach,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {configureSchoolLogin,schoolOrigin} from '../src/background/school-login';
const script=readFileSync(new URL('../src/content/school-login.js',import.meta.url),'utf8');
let pages:JSDOM[]=[];
afterEach(()=>{pages.forEach(p=>{p.window.dispatchEvent(new p.window.Event("pagehide"));p.window.close()});pages=[];vi.unstubAllGlobals()});
function page(html='<input id="userNameInput" value="student@uwaterloo.ca"><button>Next</button>',url='https://adfs.uwaterloo.ca/adfs/ls/'){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'});pages.push(dom);
 dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:20,height:20}] as any};
 const click=vi.fn();dom.window.document.querySelector('button')?.addEventListener('click',e=>{e.preventDefault();click()});
 return {dom,click,run:()=>dom.window.eval(script)};
}
it('continues a prefilled Waterloo username once, including repeated injection',()=>{const p=page();p.run();p.run();expect(p.click).toHaveBeenCalledTimes(1)});
it.each(['https://example.com/adfs/ls/','https://adfs.uwaterloo.ca/other','http://adfs.uwaterloo.ca/adfs/ls/'])('does not run outside the exact HTTPS SSO page: %s',url=>{const p=page(undefined,url);p.run();expect(p.click).not.toHaveBeenCalled()});
it.each(['','student@example.com'])('waits for a valid prefilled Waterloo username: %s',value=>{const p=page(`<input id="userNameInput" value="${value}"><button>Next</button>`);p.run();expect(p.click).not.toHaveBeenCalled()});
it.each(['<input type="password">','<input autocomplete="one-time-code">','<div role="alert">Sign-in error</div>'])('never advances password, MFA or error pages',extra=>{const p=page(`<input id="userNameInput" value="student@uwaterloo.ca"><button>Next</button>${extra}`);p.run();expect(p.click).not.toHaveBeenCalled()});
it('detects browser autofill property changes without an input event',async()=>{const p=page('<input id="userNameInput"><button>Next</button>');p.run();(p.dom.window.document.querySelector('input') as HTMLInputElement).value='student@uwaterloo.ca';await new Promise(r=>setTimeout(r,500));expect(p.click).toHaveBeenCalledTimes(1)});
it('does not submit a form whose action targets another host',()=>{const p=page('<form action="https://example.com"><input id="userNameInput" value="student@uwaterloo.ca"><button>Next</button></form>');p.run();expect(p.click).not.toHaveBeenCalled()});
it('requires explicit permission and registers only the Waterloo host',async()=>{
 const register=vi.fn(),unregister=vi.fn(),inject=vi.fn();let granted=false;let existing:any[]=[];
 vi.stubGlobal('chrome',{permissions:{contains:async()=>granted},scripting:{getRegisteredContentScripts:async()=>existing,registerContentScripts:register,unregisterContentScripts:unregister,executeScript:inject},tabs:{query:async()=>[{id:3}]}});
 await expect(configureSchoolLogin(true)).rejects.toThrow('school-login-permission');expect(register).not.toHaveBeenCalled();
 granted=true;await configureSchoolLogin(true);expect(register).toHaveBeenCalledWith([expect.objectContaining({matches:[schoolOrigin],persistAcrossSessions:true,js:['school-login.js']})]);expect(inject).toHaveBeenCalledTimes(1);
 existing=[{id:'watdesk-school-next'}];await configureSchoolLogin(false);expect(unregister).toHaveBeenCalledWith({ids:['watdesk-school-next']});
});
