import type {SyncStatus} from '../domain';
export function syncReadStatus(source:SyncStatus|undefined,started:number,finished:boolean):'done'|'error'|'reading'{
 if(finished)return source?.status==='error'?'error':source?.status==='ok'?'done':'error';
 if(!source?.attempt||Date.parse(source.attempt)<started||!Number.isFinite(Date.parse(source.attempt)))return 'reading';
 return source.status==='ok'?'done':source.status==='error'?'error':'reading';
}
