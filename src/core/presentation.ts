import type {Entry,Locale} from '../domain';
export const entryKinds=['assignment','quiz','lab','discussion','reading','content','exam','task'] as const;
export type EntryKind=typeof entryKinds[number];
export function entryKind(e:Pick<Entry,'type'|'title'|'category'>):EntryKind{
 if(e.type==='exam')return 'exam';
 if(e.category&&entryKinds.includes(e.category)&&e.category!=='content')return e.category;
 const title=e.title;
 if(/\b(quiz|test)\b|测验|小测/i.test(title))return 'quiz';
 if(/\b(midterm|final exam|examination)\b|期中考试|期末考试/i.test(title))return 'exam';
 if(/\blab(?:oratory)?\b|实验/i.test(title))return 'lab';
 if(/\bdiscussion\b|讨论/i.test(title))return 'discussion';
 if(/\b(reading|lecture notes)\b|阅读|讲义/i.test(title))return 'reading';
 if(/\b(assignment|problem set|homework)\b|^A\d{2}\b|作业/i.test(title))return 'assignment';
 return e.category==='content'?'content':'task';
}
export function kindLabel(kind:EntryKind,locale:Locale){return (locale==='zh-CN'?{assignment:'作业',quiz:'测验',lab:'实验',discussion:'讨论',reading:'阅读',content:'课程内容',exam:'考试',task:'任务'}:{assignment:'Assignment',quiz:'Quiz',lab:'Lab',discussion:'Discussion',reading:'Reading',content:'Course content',exam:'Exam',task:'Task'})[kind]}
const colors=['#d6baf1','#a9d1fc','#b2e0bf','#ffd09e','#f1b9cf','#b1e0de','#e1c6ae','#c8c5f4','#e5dd9d','#ffc0b3','#b9dbef','#d2dea6'];
const reserved:Record<string,number>={'CS 135':0,'MATH 135':1,'MATH 137':2,'ECON 101':3,'ENGL 119':4};
export function courseColors(courses:string[]):Record<string,string>{
 const result:Record<string,string>={},used=new Set<number>();
 for(const course of [...new Set(courses)].sort())if(course in reserved){used.add(reserved[course]);result[course]=colors[reserved[course]]}
 for(const course of [...new Set(courses)].sort())if(!result[course]){let n=0;while(used.has(n))n++;used.add(n);result[course]=colors[n]||`hsl(${Math.round(n*137.508)%360} 58% 82%)`}
 return result;
}
export function needsGradeRefresh(at:string|undefined,force=false,now=Date.now()){const age=now-Date.parse(at||'');return force||!Number.isFinite(age)||age<0||age>=1800000}
