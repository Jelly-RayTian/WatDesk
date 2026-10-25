import type {AppState,Entry} from '../domain';
import {validateBackup} from './util';
// Add-only imports: never replace personal edits, completion marks or platform records.
export function importDeadlineItems(state:AppState,text:string):AppState{
 if(new TextEncoder().encode(text).length>2000000)throw Error('import-too-large');
 const data=JSON.parse(text);if(data?.format!=='watdesk-items-v1'||!Array.isArray(data.entries)||data.entries.length>200)throw Error('invalid-import');
 if(data.entries.some((e:Entry)=>!e||e.platform!=='manual'||!e.id?.startsWith('manual:')))throw Error('invalid-import');
 const ids=new Set(state.entries.map(e=>e.id));const extra:Entry[]=[];for(const entry of data.entries){if(ids.has(entry.id))continue;ids.add(entry.id);extra.push(entry)}
 return validateBackup(JSON.stringify({...state,entries:[...state.entries,...extra]}));
}
