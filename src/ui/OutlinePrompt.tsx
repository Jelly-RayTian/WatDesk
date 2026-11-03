import {useState} from 'react';
import {FileText,X} from '@phosphor-icons/react';
import type {AppState} from '../domain';
const key='watdesk.outlinePromptDismissed';
const dismissed=()=>{try{return localStorage.getItem(key)==='1'}catch{return false}};
// Dates that only appear in a course outline (for example ENGL) are invisible until the user opts in, so say so once.
export function OutlinePrompt({state,enable}:{state:AppState;enable:()=>void}){
 const [hidden,setHidden]=useState(dismissed);
 const zh=state.settings.locale==='zh-CN';
 if(hidden||state.settings.outlineEnabled||!state.settings.onboardingComplete)return null;
 return <section className="outline-prompt" role="region" aria-label={zh?'课程大纲':'Course outlines'}>
  <FileText size={20} aria-hidden="true"/>
  <p><b>{zh?'有些课的作业和考试只写在课程大纲里':'Some courses list deadlines only in the course outline'}</b><span>{zh?'启用后，WatDesk 用你已登录的 outline.uwaterloo.ca 自动读取每门课大纲里写明日期的安排（例如 ENGL）。只读，不猜测未公布的日期。':'WatDesk then reads dated assessments from every course outline using your signed-in outline.uwaterloo.ca session (for example ENGL). Read-only; unpublished dates are never guessed.'}</span></p>
  <button className="button primary" onClick={enable}>{zh?'启用':'Enable'}</button>
  <button className="icon-button" aria-label={zh?'不再提示':'Dismiss'} onClick={()=>{try{localStorage.setItem(key,'1')}catch{/* The prompt just returns next time. */}setHidden(true)}}><X size={16}/></button>
 </section>;
}
