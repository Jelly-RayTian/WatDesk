import {afterEach,expect,it,vi} from 'vitest';
import {emptyState,type Entry} from '../src/domain';
import {loadState} from '../src/core/state';
import {validateBackup} from '../src/core/util';
import {relay} from '../src/adapters/read';
import {settingsPatch,overlayPatch} from '../src/core/patches';
const item:Entry={id:'learn:1',platform:'learn',course:'CS 135',title:'Assignment',type:'task',start:null,end:null,due:null,status:'open',url:'javascript:alert(1)',gone:true};
afterEach(()=>vi.unstubAllGlobals());
it('repairs unsafe persisted synced links before saving, including gone records, preserving external web links and notes',async()=>{
 const s=emptyState();s.entries=[item,{...item,id:'learn:2',url:'https://piazza.com/course'}];s.overlays[item.id]={note:'keep'};
 vi.stubGlobal('chrome',{storage:{local:{get:async()=>({watdesk:s})}}});
 const loaded=await loadState();expect(loaded.entries[0].url).toBe('');expect(loaded.entries[1].url).toBe(s.entries[1].url);expect(loaded.overlays).toEqual(s.overlays);expect(s.entries[0].url).toBe(item.url);
 expect(()=>validateBackup(JSON.stringify(loaded))).not.toThrow();
});
it('blocks encoded traversal on the sibling Crowdmark relay before looking up a tab',async()=>{
 await expect(relay('crowdmark','/api/v2/student/%2e%2e/%2e%2e/admin')).rejects.toThrow('path');
});
it('preserves known settings and ignores unknown keys, but rejects values serialization would silently erase',()=>{
 expect(settingsPatch({palette:'ocean',unknown:true})).toEqual({palette:'ocean'});
 for(const patch of [{taskLead:NaN},{examLeads:[Infinity]},{gradePlans:{x:{target:undefined}}}])expect(()=>settingsPatch(patch)).toThrow();
 for(const settings of [{...emptyState().settings,visualVersion:'3'},{...emptyState().settings,zone:null},{...emptyState().settings,zone:undefined}])expect(()=>validateBackup(JSON.stringify({...emptyState(),settings}))).toThrow();
});
it('checks overlay values and preserves the null unlink contract',()=>{
 expect(overlayPatch({done:true,note:'keep',linkedTo:null,unknown:true})).toEqual({done:true,note:'keep',linkedTo:undefined});
 for(const patch of [{done:'yes'},{note:{}},{hidden:1},{linkedTo:[]},null,[]])expect(()=>overlayPatch(patch)).toThrow();
});
