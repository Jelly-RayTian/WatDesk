import {Check} from '@phosphor-icons/react';
import type {Platform} from '../domain';
export const sourceName=(p:Platform)=>({learn:'Learn',crowdmark:'Crowdmark',odyssey:'Odyssey',cs135:'CS 135',manual:'Personal'}[p]);

// Completed sources are determinate; the active source has no measurable byte total.
export function SyncProgress({targets,completed,active,reading=[],failed,zh}:{targets:Platform[];completed:Platform[];active?:Platform;reading?:Platform[];failed?:Platform;zh:boolean}){
 const count=targets.filter(p=>completed.includes(p)).length;
 return <div className="sync-progress"><div className="sync-progress-segments" role="progressbar" aria-label={zh?'平台连接进度':'Platform connection progress'} aria-valuemin={0} aria-valuemax={targets.length||1} aria-valuenow={count} aria-valuetext={`${count}/${targets.length}${active?` · ${sourceName(active)}`:''}`}>
  {targets.map(p=><span key={p} className={`sync-progress-segment ${p===failed?'failed':(p===active||reading.includes(p))?'reading':completed.includes(p)?'complete':''}`}><i/></span>)}
 </div><div className="sync-progress-labels" aria-hidden="true">{targets.map(p=><span key={p} className={p===failed?'danger':(p===active||reading.includes(p))?'current':completed.includes(p)?'complete':''}>{completed.includes(p)&&p!==active&&<Check size={10}/>}<span>{sourceName(p)}</span></span>)}</div></div>;
}
export function ReadingBar({zh}:{zh:boolean}){
 return <div className="reading-bar" role="progressbar" aria-label={zh?'正在读取此来源':'Reading this source'}><i/></div>;
}
