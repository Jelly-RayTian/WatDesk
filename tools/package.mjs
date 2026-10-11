import {mkdir,cp} from 'node:fs/promises';
await mkdir('../../outputs/WatDesk',{recursive:true});
await cp('dist','../../outputs/WatDesk/extension',{recursive:true});
console.log('Packaged outputs/WatDesk/extension');
