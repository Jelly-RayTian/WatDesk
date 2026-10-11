import {useEffect,useState} from 'react';
import {ArrowClockwise,ArrowSquareOut,Check,Warning} from '@phosphor-icons/react';
import {platforms,type AppState,type Platform,type SyncStatus} from '../domain';
import {fmt} from '../core/util';
import {SyncProgress,ReadingBar} from './SyncProgress';
import {formatLearnIssue,learnToolLabel} from '../adapters/learn-availability';
const label=(p:Platform)=>({learn:'Learn',crowdmark:'Crowdmark',odyssey:'Odyssey',cs135:'CS 135',manual:'Personal'}[p]);
const phase=(s:SyncStatus|undefined,zh:boolean)=>s?.phase==='page'?(zh?'检查页面与登录':'Checking page and sign-in'):s?.phase==='grades'?(zh?'读取历史成绩':'Reading grade history'):(zh?'读取任务与安排':'Reading tasks and schedule');
export function LearnReadDetails({status,zh,gradesOnly=false}:{status:SyncStatus|undefined;zh:boolean;gradesOnly?:boolean}){
 const issues=status?.issues?.filter(i=>!gradesOnly||i.tool==='grades');if(!issues?.length)return null;
 const groups=new Map<string,typeof issues>();
 for(const issue of issues){const key=JSON.stringify([issue.course,issue.status,issue.code,issue.kind]);groups.set(key,[...(groups.get(key)||[]),issue])}
 return <details className="learn-read-details"><summary>{zh?'部分课程工具不可读':'Some course tools unavailable'} · {issues.length}</summary>
 <p>{zh?'其余数据已更新，未读部分保留历史记录。403 表示接口拒绝访问，不代表未提交或没有成绩。':'Other data is updated; unread sections keep saved records. HTTP 403 means access was denied, not that work is unsubmitted or ungraded.'}</p>
 <ul className="learn-issue-groups">{[...groups.entries()].map(([key,items])=>{const first=items[0];return <li key={key} className={first.kind==='failed'?'danger':''}><div><b>{first.course}</b><span className="issue-code">{first.status?'HTTP '+first.status:first.code}</span></div><span>{[...new Set(items.map(i=>learnToolLabel(i.tool,zh)))].join(zh?'、':', ')}</span>{first.status!==403&&<small>{formatLearnIssue(first,zh)}</small>}</li>})}</ul>
 <a href="https://learn.uwaterloo.ca/d2l/home" target="_blank" rel="noreferrer">{zh?'到 Learn 核对':'Verify on Learn'} <ArrowSquareOut size={12}/></a></details>;

}
export function BackgroundSync({state,retry,details}:{state:AppState;retry:()=>void;details:()=>void}){
 const run=state.syncRun,zh=state.settings.locale==='zh-CN';
 const individual=!run||run.finished?platforms.find(p=>state.sources[p]?.status==='syncing'||!!state.sources[p]?.phase):undefined;
 const busy=run&&!run.finished||!!individual,current=run?.active||individual,failed=run?.failed&&state.sources[run.failed]?.status==='error'?run.failed:undefined;
 const pending=!!run?.finished&&run.completed.length<run.targets.length;const count=individual?0:run?.completed.length||0,total=individual?1:run?.targets.length||0;
 if(!run&&!individual)return null;
 const targets=individual?[individual]:run?.targets||[],completed=individual?[]:run?.completed||[];
 return <section className={`background-sync ${failed?'has-error':''} ${busy?'is-reading':!failed&&!pending?'is-settled':''}`} aria-label={zh?'同步状态':'Sync status'}><div className="background-sync-copy" role="status">{busy?<ArrowClockwise className="sync-spinner" size={14}/>:failed?<Warning size={14}/>:<Check size={14}/>}<span>{busy?(current?`${label(current)} · ${phase(state.sources[current],zh)}`:(zh?'准备后台更新':'Preparing background update')):failed?(zh?`${label(failed)} 更新失败，已保留数据`:`${label(failed)} update failed. Saved data retained.`):pending?(zh?'此来源已恢复，可继续更新':'Source recovered. Continue updating.'):(zh?'课业已就绪':'Your desk is ready')}</span><small>{count}/{total}</small></div><SyncProgress targets={targets} completed={completed} active={busy?current:undefined} failed={failed} zh={zh}/><div className="background-sync-footer"><span>{busy?(zh?'可继续浏览，内容会自动更新':'Keep browsing; updates appear automatically'):run?.reused?.length?(zh?`${run.reused.length} 个来源使用近期数据`:`${run.reused.length} sources used recent data`):(zh?'各来源详情可查看最后成功时间':'See sources for the last successful update')}</span><button className="text-button" onClick={failed||pending?retry:details}>{failed||pending?(zh?'继续重试':'Try again'):(zh?'详情':'Details')}</button></div></section>;
}
export function SourcePanel({state,retry,open,toggleCs135}:{state:AppState;toggleCs135:()=>void;retry:(p:Exclude<Platform,'manual'>)=>void;open:(p:Exclude<Platform,'manual'>)=>void}){
 const zh=state.settings.locale==='zh-CN';const [now,setNow]=useState(Date.now());
 const busy=platforms.some(p=>state.sources[p]?.status==='syncing'||!!state.sources[p]?.phase);
 useEffect(()=>{if(!busy)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[busy]);
 return <section className="source-panel"><div className="section-title"><h2>{zh?'数据来源':'Sources'}</h2><span className="small muted">4</span></div>{platforms.map(p=>{
  if(p==='cs135'&&!state.settings.cs135Enabled)return <div className="source-row" key={p}><div className="source-monogram">CS</div><div className="source-copy"><b>CS 135 · {zh?'可选':'Optional'}</b><small className="muted">{zh?'未启用，不会读取课程官网':'Disabled; course website is not read'}</small></div><button className="text-button" onClick={toggleCs135}>{zh?'启用':'Enable'}</button></div>;
  const s=state.sources[p],reading=s?.status==='syncing'||!!s?.phase;
  const seconds=reading?Math.max(0,Math.floor((now-Date.parse(s?.attempt||''))/1000)):s?.durationMs!=null?(s.durationMs/1000).toFixed(1):null;
  return <div className="source-row" key={p}><div className="source-monogram">{p==='cs135'?'CS':label(p)[0]}</div><div className="source-copy"><b>{label(p)}</b>{p==='cs135'&&<button className="text-button" onClick={toggleCs135}>{zh?'停用':'Disable'}</button>}<span className={s?.status==='error'?'danger':'muted'}>{reading?phase(s,zh):s?.status==='ok'?(zh?'已连接':'Connected'):s?.status==='error'?(zh?'读取失败':'Read failed'):(zh?'尚未连接':'Not connected')}{seconds!=null&&` · ${seconds} s`}</span>{reading&&<ReadingBar zh={zh}/>}<small className="muted">{zh?'最后成功：':'Last success: '}{s?.at?fmt(s.at,state.settings.locale,state.settings.zone):(zh?'尚无':'Never')}</small></div><button className="icon-button" disabled={reading} aria-label={`${zh?'刷新':'Refresh'} ${label(p)}`} title={zh?'仅刷新此来源':'Refresh only this source'} onClick={()=>retry(p)}><ArrowClockwise size={18}/></button>{p==='learn'&&<LearnReadDetails status={s} zh={zh}/>}
{s?.error&&<div className="source-failure"><code>{s.error==='sign-in-required'?(zh?'需要你完成密码或验证码；完成登录后会自动继续。':'Complete your password or verification step; syncing resumes after sign-in.'):s.error}</code><button className="text-button" onClick={()=>open(p)}>{zh?'打开网站检查':'Check website'}<ArrowSquareOut size={13}/></button></div>}</div>
 })}<p className="small muted">{zh?'自动更新会复用近期成功数据；点击刷新按钮将重新读取。':'Automatic updates reuse recent successful data. Refresh forces a new read.'}</p></section>;
}
