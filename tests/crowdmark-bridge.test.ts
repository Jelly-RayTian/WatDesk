import {expect,it} from 'vitest';
import {crowdmarkRelay} from '../src/adapters/crowdmark-bridge';
it('rejects relay paths that leave the student API after URL parsing',async()=>{
 for(const path of ['/api/v2/student/%2e%2e/%2e%2e/admin','/api/v2/student/../x','https://evil.example/api/v2/student/','/api/v2/admin'])await expect(crowdmarkRelay(path)).rejects.toThrow('path');
});
