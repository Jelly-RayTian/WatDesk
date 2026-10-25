import {afterEach,expect,it,vi} from 'vitest';
import {emptyState} from '../src/domain';
import {readPlatform} from '../src/adapters/read';
const parser=vi.hoisted(()=>({parse:vi.fn()}));
vi.mock('../src/adapters/background-html',async original=>({...await original<any>(),parseBackgroundHtml:parser.parse}));
afterEach(()=>vi.unstubAllGlobals());
it('reads Odyssey without requiring an open browser tab',async()=>{
 const create=vi.fn(),query=vi.fn(),update=vi.fn();
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{query,create,update}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('<h1>Assessment Schedule (student)</h1>',{headers:{'content-type':'text/html'}})));
 parser.parse.mockResolvedValue({heading:'Assessment Schedule (student)',rows:[['Exam','Duration','When']]});
 const result=await readPlatform('odyssey',emptyState(),false,7);expect(result.identity).toBe('student');expect(create).not.toHaveBeenCalled();expect(query).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledWith('https://odyssey.uwaterloo.ca/teaching/schedule',expect.objectContaining({credentials:'include',redirect:'manual'}));
});
it('reports expired Odyssey login without following the sign-in redirect',async()=>{vi.stubGlobal('chrome',{permissions:{contains:async()=>true}});vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302,headers:{location:'https://adfs.uwaterloo.ca'}})));await expect(readPlatform('odyssey',emptyState())).rejects.toThrow('signed-out')});
