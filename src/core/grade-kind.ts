export type GradeKind='assessment'|'overall'|'average'|'class-average';
export function gradeKind(e:{title:string;gradeKind?:GradeKind}):GradeKind{
 if(e.gradeKind)return e.gradeKind;
 const title=e.title.trim();
 if(/^(?:total|overall|final average|weighted average|总分|总均分)$/i.test(title))return 'overall';
 if(/\b(?:class|cohort|section)\s+(?:average|mean)\b|班级平均|全班平均/i.test(title))return 'class-average';
 if(/\b(?:final\s+(?:calculated|adjusted)\s+grade|overall(?:\s+(?:grade|average|score))?|course\s+(?:grade|total|average)|final\s+grade|total\s+(?:grade|score))\b|总评|总均分|总成绩|课程总分/i.test(title))return 'overall';
 if(/\b(?:average|mean|subtotal)(?:\s+(?:grade|score))?$|平均分|均分|小计/i.test(title))return 'average';
 return 'assessment';
}
export function gradeKindLabel(kind:GradeKind,zh:boolean){return (zh?{'assessment':'单项成绩','overall':'平台总评','average':'分项平均 / 汇总','class-average':'班级平均'}:{'assessment':'Assessment','overall':'Platform overall grade','average':'Category average / subtotal','class-average':'Class average'})[kind]}
