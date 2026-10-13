import {afterEach,expect,it,vi} from 'vitest';
import {emptyState} from '../src/domain';
import {readPlatform} from '../src/adapters/read';
afterEach(()=>vi.unstubAllGlobals());
it('a closed pinned Odyssey tab fails without acquiring or creating a replacement',async()=>{
 const create=vi.fn(),query=vi.fn();
 vi.stubGlobal('chrome',{permissions:{contains:async()=>true},tabs:{get:async()=>{throw Error('No tab with id: 7')},query,create}});
 await expect(readPlatform('odyssey',emptyState(),false,7)).rejects.toThrow('No tab with id');
 expect(create).not.toHaveBeenCalled();expect(query).not.toHaveBeenCalled();
});
