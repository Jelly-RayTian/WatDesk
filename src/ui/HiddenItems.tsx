import {ArrowCounterClockwise,EyeSlash} from '@phosphor-icons/react';
import type {AppState} from '../domain';
import {fmtEntry} from '../core/util';
// Items hidden from the calendar or lists stay recoverable one by one.
export function HiddenItems({state,perform}:{state:AppState;perform:(type:string,args?:object)=>Promise<any>}){
 const zh=state.settings.locale==='zh-CN';
 const items=state.entries.filter(e=>state.overlays[e.id]?.hidden&&!e.gone&&!e.gradeOnly);
 if(!items.length)return null;
 return <section className="settings-section hidden-items"><h2><EyeSlash size={20}/>{zh?'已隐藏的事项':'Hidden items'}</h2>
  <p className="small muted">{zh?'这些事项不会出现在列表、日历和提醒中。':'These items are left out of lists, the calendar and reminders.'}</p>
  <ul>{items.map(e=><li key={e.id}><span><b>{e.course||(zh?'个人':'Personal')}</b> · {e.title}<small className="muted">{fmtEntry(e,state.settings.locale,state.settings.zone)}</small></span>
   <button className="text-button" onClick={()=>void perform('overlay',{id:e.id,ids:e.mergedIds||[e.id],patch:{hidden:false}})}><ArrowCounterClockwise size={14}/>{zh?'恢复':'Restore'}</button></li>)}</ul>
  {items.length>1&&<button className="button secondary" onClick={()=>void perform('overlay',{ids:items.map(e=>e.id),patch:{hidden:false}})}>{zh?'全部恢复':'Restore all'}</button>}
 </section>;
}
