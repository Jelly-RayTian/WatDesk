import {afterEach,expect,it,vi} from 'vitest';
import {emptyState} from '../src/domain';
import {readPlatform} from '../src/adapters/read';
const parser=vi.hoisted(()=>({parse:vi.fn(),login:vi.fn()}));
vi.mock('../src/adapters/login',()=>({autoLogin:parser.login}));
vi.mock('../src/adapters/background-html',async original=>({...await original<any>(),parseBackgroundHtml:parser.parse}));
afterEach(()=>vi.unstubAllGlobals());
it('reads Odyssey without requiring an open browser tab',async()=>{
 const create=vi.fn(),query=vi.fn(),update=vi.fn();
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{query,create,update}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('<h1>Assessment Schedule (student)</h1>',{headers:{'content-type':'text/html'}})));
 parser.parse.mockResolvedValue({heading:'Assessment Schedule (student)',rows:[['Exam','Duration','When']]});
 const result=await readPlatform('odyssey',emptyState(),false,7);expect(result.identity).toBe('student');expect(create).not.toHaveBeenCalled();expect(query).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledWith('https://odyssey.uwaterloo.ca/teaching/schedule',expect.objectContaining({credentials:'include',redirect:'manual'}));
});
it('refreshes a redirect-only Odyssey session in an inactive temporary page and closes it',async()=>{
 const create=vi.fn().mockResolvedValue({id:9}),remove=vi.fn().mockResolvedValue(undefined),update=vi.fn(),focus=vi.fn();
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create,remove,update,get:async()=>({id:9,status:'complete',url:'https://odyssey.uwaterloo.ca/teaching/schedule'})},windows:{update:focus},scripting:{executeScript:async()=>[{result:{heading:'Assessment Schedule (student)',rows:[['Exam','Duration','When']]}}]}});vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302})));parser.login.mockResolvedValue(undefined);
 const result=await readPlatform('odyssey',emptyState());expect(result.identity).toBe('student');expect(create).toHaveBeenCalledWith({url:'https://odyssey.uwaterloo.ca/teaching/schedule',active:false});expect(remove).toHaveBeenCalledExactlyOnceWith(9);expect(focus).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();
});
it('only asks for real sign-in input after the temporary session refresh cannot proceed',async()=>{const remove=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{create:async()=>({id:9}),remove}});vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302})));parser.login.mockRejectedValue(Error('sign-in-required'));await expect(readPlatform('odyssey',emptyState())).rejects.toThrow('sign-in-required');expect(remove).toHaveBeenCalledWith(9)});
