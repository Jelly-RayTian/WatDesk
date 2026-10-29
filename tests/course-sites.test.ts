import {it,expect} from 'vitest';
import {courseSites,isCourseSite} from '../src/core/course-sites';
import {settingsPatch} from '../src/core/patches';
import {emptyState} from '../src/domain';
import {validateBackup} from '../src/core/util';
import {loadState} from '../src/core/state';
it('lists only https course sites on the CS student server with unique ids',()=>{
 expect(new Set(courseSites.map(c=>c.id)).size).toBe(courseSites.length);
 for(const c of courseSites){expect(isCourseSite(c.id)).toBe(true);const u=new URL(c.url);expect(u.protocol).toBe('https:');expect(u.hostname).toBe('student.cs.uwaterloo.ca')}
});
it('accepts known course site ids in settings patches and backups and rejects others',()=>{
 expect(settingsPatch({courseSites:['cs245']})).toEqual({courseSites:['cs245']});
 expect(()=>settingsPatch({courseSites:['evil']})).toThrow('invalid');
 expect(()=>settingsPatch({courseSites:'cs245'})).toThrow('invalid');
 const s=emptyState();s.settings.courseSites=['cs341'];expect(validateBackup(JSON.stringify(s)).settings.courseSites).toEqual(['cs341']);
 const bad:any=emptyState();bad.settings.courseSites=['nope'];expect(()=>validateBackup(JSON.stringify(bad))).toThrow('restoreError');
});
it('starts new installations in English regardless of browser language',async()=>{
 (globalThis as any).chrome={storage:{local:{get:async()=>({})}}};
 Object.defineProperty(globalThis.navigator,'language',{value:'zh-CN',configurable:true});
 expect((await loadState()).settings.locale).toBe('en');
});
