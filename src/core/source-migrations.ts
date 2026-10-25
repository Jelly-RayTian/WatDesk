import type {AppState} from '../domain';
// One repair for the old ou-prefixed URL bug; preserve user data and real timestamps.
export function repairScheduleCache(state:AppState):AppState{
 const source=state.sources.learn;
 if(!source||source.scheduleVersion===1||!source.issues?.some(i=>i.tool==='schedule'&&i.status===404))return state;
 return {...state,sources:{...state.sources,learn:{...source,status:'idle',phase:undefined,error:undefined,courseReadAt:{},scheduleVersion:1}}};
}
