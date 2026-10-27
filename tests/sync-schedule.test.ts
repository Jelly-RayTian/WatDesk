import {expect,it,vi,afterEach} from 'vitest';
import {emptyState} from '../src/domain';
import {validateBackup} from '../src/core/util';
import {configureSyncSchedule,syncMinutes} from '../src/background/sync-schedule';
afterEach(()=>vi.unstubAllGlobals());
it('defaults existing and new profiles to six hours',()=>{expect(syncMinutes(emptyState().settings)).toBe(360);expect(emptyState().settings.syncIntervalMinutes).toBe(360)});
it('updates the alarm only when needed, preserving its next scheduled time',async()=>{const create=vi.fn(),clear=vi.fn();let period=30;vi.stubGlobal('chrome',{alarms:{get:async()=>({periodInMinutes:period}),create:async(...args:any[])=>{create(...args);period=args[1].periodInMinutes},clear}});await configureSyncSchedule(emptyState().settings);await configureSyncSchedule(emptyState().settings);expect(create).toHaveBeenCalledTimes(1);expect(create).toHaveBeenCalledWith('sync',{periodInMinutes:360});await configureSyncSchedule({...emptyState().settings,syncIntervalMinutes:120});expect(create).toHaveBeenLastCalledWith('sync',{periodInMinutes:120});await configureSyncSchedule({...emptyState().settings,syncIntervalMinutes:0});expect(clear).toHaveBeenCalledWith('sync')});
it('rejects malformed intervals in settings and restored backups',()=>{for(const value of [-1,1,NaN,Infinity,'360',360.5,10081]){const s=emptyState();(s.settings as any).syncIntervalMinutes=value;expect(()=>validateBackup(JSON.stringify(s))).toThrow()}});
