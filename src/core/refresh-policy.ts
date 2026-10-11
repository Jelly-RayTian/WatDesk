import {type AppState,type SyncStatus,type Platform} from '../domain';
const minutes:Record<string,number>={learn:2,crowdmark:2,odyssey:5,cs135:30};
export function canReuseSource(p:Platform,status:SyncStatus|undefined,force=false,now=Date.now()){
 const age=now-Date.parse(status?.at||'');
 return !force&&status?.status==='ok'&&!status.phase&&(!status.error||p==='crowdmark'&&/^crowdmark-(?:grades|archive)/.test(status.error))&&Number.isFinite(age)&&age>=0&&age<(minutes[p]||0)*60000;
}
export function hasSavedData(state:AppState){return state.entries.some(e=>!e.gone)||Object.values(state.sources).some(s=>!!s.at)}
