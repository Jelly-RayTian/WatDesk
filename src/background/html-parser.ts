import {collectCs135Submissions} from '../adapters/cs135-submissions';
export function parseHtml(kind:string,html:string){
 if(typeof html!=='string'||html.length>2000000)throw Error('html-too-large');
 const doc=new DOMParser().parseFromString(html,'text/html');
 if(kind==='cs135')return collectCs135Submissions(doc);
 if(kind==='outline')return collectOutline(doc);
 if(kind!=='rows'&&kind!=='odyssey')throw Error('parse-kind');
 const rows=[...doc.querySelectorAll(kind==='odyssey'?'main table tr':'table tr')].map(r=>[...r.querySelectorAll('th,td')].flatMap(c=>Array(kind==='odyssey'?Math.min(100,Math.max(1,Number(c.getAttribute('colspan')||1)||1)):1).fill('').map((_,i)=>i===0?c.textContent?.replace(/\s+/g,' ').trim()||'':'')));
 return kind==='rows'?rows:{heading:doc.querySelector('h1')?.textContent||'',rows};
}
// The outline viewer renders each section as an <h2 id> followed by its content; only the assessments table is read.
function collectOutline(doc:Document){
 for(const br of doc.querySelectorAll('br'))br.replaceWith(' ');
 const clean=(c:Element)=>c.textContent?.replace(/\s+/g,' ').trim()||'';
 const heading=[...doc.querySelectorAll('h1,h2')].map(clean).find(t=>/\b(?:Fall|Winter|Spring)\s+\d{4}\b/i.test(t))||doc.title.replace(/\s+/g,' ').trim();
 const start=doc.getElementById('assessments_amp_activities');if(!start)throw Error('outline-format');
 const rows:string[][]=[];
 for(let n=start.nextElementSibling;n&&n.tagName!=='H2';n=n.nextElementSibling)for(const r of n.querySelectorAll('tr'))rows.push([...r.querySelectorAll('th,td')].map(clean));
 return {heading,rows:rows.slice(0,200)};
}
