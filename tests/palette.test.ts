import {it,expect} from 'vitest';
import {emptyState,palettes} from '../src/domain';
import {validateBackup} from '../src/core/util';
it('accepts every palette and rejects unknown ones',()=>{
 for(const palette of palettes){const s=emptyState();s.settings.palette=palette;expect(validateBackup(JSON.stringify(s)).settings.palette).toBe(palette)}
 const bad:any=emptyState();bad.settings.palette='neon';expect(()=>validateBackup(JSON.stringify(bad))).toThrow('restoreError');
});
