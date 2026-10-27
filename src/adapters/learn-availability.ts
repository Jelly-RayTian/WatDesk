import type {Entry,LearnReadIssue} from '../domain';
import {parseLearnGrades} from './learn-extras';

export function learnIssue(course:string,tool:string,error:unknown):LearnReadIssue{
 const e=error as {code?:string;status?:number};const message=error instanceof Error?error.message:'';
 const http=message.match(/^http:(\d{3})$/);const code=e?.code||(http?'http':/^[a-z][a-z0-9-]{0,79}$/.test(message)?message:'unknown');
 const status=e?.status??(code==='forbidden'?403:code==='not-found'?404:http?Number(http[1]):undefined);
 return {course,tool,code,status,kind:status===403||status===404||['schedule-pdf-unsupported','schedule-format-unsupported','pdf-no-text','pdf-schedule-unrecognized'].includes(code)?'unavailable':'failed'};
}
export function toolIssues(reports:Array<{code:string;tools?:Record<string,unknown>;discussionsPartial?:number;readOk?:string[]}>):LearnReadIssue[]{
 return reports.flatMap(r=>{
  const issues=Object.entries(r.tools||{}).filter(([,value])=>typeof value==='string'&&value.startsWith('failed')).map(([tool,value])=>learnIssue(r.code,tool,{code:String(value).replace(/^failed:?\s*/,'')||'unknown'}));
  if(r.discussionsPartial&&!issues.some(i=>i.tool==='discussions'))issues.push(learnIssue(r.code,'discussions',{code:'partial'}));
  if(r.readOk&&!r.readOk.includes('feed')&&!issues.some(i=>i.tool==='myItems'))issues.push(learnIssue(r.code,'myItems',{code:'partial'}));
  return issues;
 });
}
export async function readLearnGradeBatch(source:{versions:{le:string};paged:(path:string)=>Promise<unknown[]>},courses:Array<{id:string;orgUnitId:number;code:string}>,previous:Entry[]){
 const entries:Entry[]=[],issues:LearnReadIssue[]=[];
 // Two bounded workers, as with the coursework reader. Each course keeps its own outcome.
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(2,courses.length)},async()=>{
  for(;;){const c=courses[cursor++];if(!c)return;
   try{const rows=await source.paged(`/d2l/api/le/${source.versions.le}/${c.orgUnitId}/grades/values/myGradeValues/`);entries.push(...parseLearnGrades(rows,c.code,c.id))}
   catch(e){const issue=learnIssue(c.code,'grades',e);if(issue.code==='signed-out'||issue.status===401)throw Error('signed-out');issues.push(issue);entries.push(...previous.filter(e=>e.readerCourseId===c.id).map(e=>({...e,readState:'retained' as const})))}
  }
 }));
 return {entries,issues,retry:issues.some(i=>i.kind==='failed')};
}
export function learnToolLabel(tool:string,zh:boolean){
 const names:Record<string,[string,string]>={grades:['成绩','Grades'],dropbox:['作业','Assignments'],quizzes:['测验','Quizzes'],discussions:['讨论','Discussions'],myItems:['待办列表','Task feed'],calendar:['日历','Calendar'],schedule:['课程日程','Course schedule']};
 return names[tool]?.[zh?0:1]||tool;
}
export function formatLearnIssue(issue:LearnReadIssue,zh:boolean){
 const tool=learnToolLabel(issue.tool,zh);
 const reason=issue.code==='pdf-no-text'?(zh?'PDF 没有可提取的文字（可能是扫描件），请核对原文件':'The PDF has no extractable text and may be scanned. Check the original file'):issue.code==='pdf-schedule-unrecognized'?(zh?'已读取 PDF，但未识别到明确的考核日期；请核对原文件':'The PDF was read, but no supported assessment dates were recognized. Check the original file'):issue.code==='schedule-pdf-unsupported'?(zh?'PDF 日程暂不支持自动解析，请核对原文件；其他来源继续更新':'PDF schedules cannot be parsed automatically yet. Check the original file; other sources continue updating'):issue.code==='schedule-format-unsupported'?(zh?'此日程不是支持的 HTML 表格，请核对原文件':'This schedule is not a supported HTML table. Check the original file'):issue.status===403?(zh?'课程未启用此工具，或接口访问受限':'The course tool may be disabled or its endpoint restricted'):issue.status===404?(zh?'平台未返回此课程的数据或接口':'No course data or endpoint was returned'):zh?'读取异常，可刷新重试':'Read failed; refresh to retry';
 return `${issue.course} · ${tool}：${reason} (${issue.status?'HTTP '+issue.status:issue.code})`;
}
