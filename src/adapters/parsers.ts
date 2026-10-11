import {type Entry} from '../domain';import {campusInstant} from '../core/util';
const clear=(s:string)=>/^(TBA|TBD|N\/A|-)$/i.test(s.trim())?'':s.trim();
export function parseCs135Html(html:string):Entry[]{
 const text=(raw:string)=>raw.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&ndash;|&#8211;/gi,'–').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>({month:text(m[1].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1]||''),cells:[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>text(c[1]))}));
 if(!tables.length||!/due at 9:00pm/i.test(text(html)))throw Error('cs135-calendar-format');
 const entries=parseCs135(tables,true);if(!entries.length)throw Error('cs135-calendar-empty');return entries;
}
export function parseOdyssey(rows:string[][]):Entry[]{
 if(!rows[0]?.some(c=>c==='Exam')||!rows[0]?.includes('When'))throw Error('parse');
 return rows.slice(1).filter(c=>c[0]).map(c=>{const m=c[2]?.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?:\s*[-–]\s*(\d{2}:\d{2}))?/);const start=m&&m[2]!=='00:00'?campusInstant(`${m[1]}T${m[2]}`):null;let end=start&&m?.[3]?campusInstant(`${m[1]}T${m[3]}`):null;if(start&&end&&end<start)end=new Date(Date.parse(end)+86400000).toISOString();return {id:`odyssey:${c[0].trim()}`,platform:'odyssey',course:c[0].match(/^[A-Z]+\s*\d+[A-Z]?/)?.[0]||'',title:c[0].trim(),type:'exam',start,end,due:null,status:'open',url:'https://odyssey.uwaterloo.ca/teaching/schedule',location:clear(c[3]||''),seat:clear(c[4]||''),duration:c[1]}})
}
export function parseCs135(tables:Array<{month:string;cells:string[]}>,hasNinePmPolicy:boolean):Entry[]{const months=['January','February','March','April','May','June','July','August','September','October','November','December'];const out:Entry[]=[];
 for(const table of tables){const m=table.month.match(/([A-Za-z]+)\s+(\d{4})/);if(!m)continue;const month=months.indexOf(m[1])+1;if(!month)continue;for(const cell of table.cells){const d=cell.match(/^\s*(\d{1,2})\b/);if(!d)continue;const date=`${m[2]}-${String(month).padStart(2,'0')}-${d[1].padStart(2,'0')}`;for(const a of cell.matchAll(/A(\d{2})\s+Due/gi)){if(!hasNinePmPolicy)continue;out.push({id:`cs135:${m[2]}:${month<5?'winter':month<9?'spring':'fall'}:a${a[1]}`,platform:'cs135',course:'CS 135',title:`Assignment ${a[1]}`,type:'task',start:null,end:null,due:campusInstant(date+'T21:00'),status:'open',url:`https://student.cs.uwaterloo.ca/~cs135/assign/a${a[1]}/a${a[1]}.pdf`})}const exam=cell.match(/(Midterm(?: exam)?|Quiz)\s+(\d{2}:\d{2})[-–](\d{2}:\d{2})/i);if(exam)out.push({id:`cs135:${date}:${exam[1]}`,platform:'cs135',course:'CS 135',title:`CS 135 ${exam[1]}`,type:'exam',start:campusInstant(date+'T'+exam[2]),end:campusInstant(date+'T'+exam[3]),due:null,status:'open',url:'https://student.cs.uwaterloo.ca/~cs135/assess/exams/index.html'})}}return out;
}
