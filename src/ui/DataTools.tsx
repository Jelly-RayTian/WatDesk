import {useState} from 'react';
import {DownloadSimple,Clock,Database,ArrowCounterClockwise} from '@phosphor-icons/react';
import type {AppState,Entry} from '../domain';
import {entryFreshness} from '../core/academic';
import {fmt,exportIcs} from '../core/util';
import {offlineHtml} from '../core/offline-export';
export function saveFile(text:string,name:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function Freshness({entry,state}:{entry:Entry;state:AppState}){
 const zh=state.settings.locale==='zh-CN';const info=entryFreshness(entry,state);
 const label=info.kind==='personal'?(zh?'个人安排':'Personal'):info.kind==='retained'?(zh?'本次未核对':'Not verified this sync'):info.kind==='unknown'?(zh?'更新时间未知':'Update time unknown'):info.kind==='fresh'?(zh?'刚刚核对':'Just verified'):(zh?'已保存':'Saved');
 return <span className={`freshness ${info.kind}`} title={info.at?`${zh?'最后核对':'Last verified'}: ${fmt(info.at,state.settings.locale,state.settings.zone)}`:label}><Clock size={11}/>{label}{info.at&&info.kind!=='fresh'&&<small>{fmt(info.at,state.settings.locale,state.settings.zone)}</small>}</span>;
}
export function LocalDataPanel({state,perform}:{state:AppState;perform:(type:string,args?:object)=>Promise<any>}){
 const zh=state.settings.locale==='zh-CN';const [error,setError]=useState('');
 return <section className="settings-section local-data"><h2><Database size={20}/>{zh?'我的本地数据':'My local data'}</h2><p>{zh?'课程、任务、成绩、提醒和完成标记自动保存在当前浏览器。关闭面板不会清空，离线仍可查看已保存记录。':'Courses, tasks, grades, reminders and completion marks stay in this browser. Closing the panel keeps them; saved records remain available offline.'}</p><div className="local-data-counts"><span><b>{state.entries.filter(e=>!e.gone).length}</b>{zh?'条记录':'records'}</span><span><b>{state.courses.length}</b>{zh?'门课程':'courses'}</span><span><b>{state.settings.classMeetings?.length||0}</b>{zh?'项上课安排':'class schedules'}</span></div><div className="button-stack">
 <button className="button primary" onClick={async()=>{const data=await perform('backup');if(data)saveFile(data,'watdesk-backup.json','application/json')}}><DownloadSimple size={16}/>{zh?'下载数据备份':'Download backup'}</button>
 <button className="button secondary" onClick={()=>saveFile(offlineHtml(state),'WatDesk-offline.html','text/html;charset=utf-8')}><DownloadSimple size={16}/>{zh?'下载离线查看页':'Download offline view'}</button>
 <button className="button secondary" onClick={()=>saveFile(exportIcs(state),'watdesk.ics','text/calendar;charset=utf-8')}>{zh?'导出日历':'Export calendar'}</button>
 <label className="button secondary file-label"><ArrowCounterClockwise size={16}/>{zh?'恢复数据备份':'Restore backup'}<input aria-label={zh?'恢复 WatDesk 数据':'Restore WatDesk data'} type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024){setError(zh?'备份超过 10 MB，未导入。':'Backup exceeds 10 MB; not imported.');return}if(confirm(zh?'恢复将替换当前本地数据。建议先下载备份，是否继续？':'Restore replaces current local data. Download a backup first. Continue?'))await perform('restore',{text:await file.text()});e.target.value=''}}/></label></div>{error&&<p className="danger">{error}</p>}<p className="small muted">{zh?'JSON 可恢复到插件；HTML 是不联网的只读快照。备份包含你的学业数据，请自行保管。':'JSON restores the extension; HTML is an offline read-only snapshot. Backups contain your academic data; keep them private.'}</p><button className="text-button danger" onClick={()=>{if(confirm(zh?'清空此浏览器里的 WatDesk 数据？此操作不可撤销，请先备份。':'Clear WatDesk data in this browser? This cannot be undone; back up first.'))void perform('clear')}}>{zh?'清空本地数据':'Clear local data'}</button></section>;
}
