import {collectCs135Submissions} from '../adapters/cs135-submissions';
export function parseHtml(kind:string,html:string){
 if(typeof html!=='string'||html.length>2000000)throw Error('html-too-large');
 const doc=new DOMParser().parseFromString(html,'text/html');
 if(kind==='cs135')return collectCs135Submissions(doc);
 if(kind!=='rows'&&kind!=='odyssey')throw Error('parse-kind');
 const rows=[...doc.querySelectorAll(kind==='odyssey'?'main table tr':'table tr')].map(r=>[...r.querySelectorAll('th,td')].flatMap(c=>Array(kind==='odyssey'?Math.min(100,Math.max(1,Number(c.getAttribute('colspan')||1)||1)):1).fill('').map((_,i)=>i===0?c.textContent?.replace(/\s+/g,' ').trim()||'':'')));
 return kind==='rows'?rows:{heading:doc.querySelector('h1')?.textContent||'',rows};
}
