import type {Entry} from '../domain';
export function retainIncomplete(previous:Entry[],fresh:Entry[],readOk:Map<string,Set<string>>):Entry[]{
 const ids=new Set(fresh.map(e=>e.id));
 return [...fresh,...previous.filter(e=>e.platform==='learn'&&!ids.has(e.id)&&(!e.seenIn?.length||e.seenIn.some(tool=>!readOk.get(e.readerCourseId||'')?.has(tool))))];
}
