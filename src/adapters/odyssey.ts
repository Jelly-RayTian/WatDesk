import {urls} from '../domain';
import {backgroundHtml,parseBackgroundHtml} from './background-html';
import {parseOdyssey} from './parsers';
import {withTemporaryTab} from './temporary-tab';
import {autoLogin} from './login';
import {withTimeout} from '../core/sync';
type Schedule={heading:string;rows:string[][]};
function snapshot(data:Schedule){if(!/Assessment Schedule/.test(data.heading))throw Error('signed-out');return {entries:parseOdyssey(data.rows),courses:[],identity:data.heading.match(/\(([^)]+)\)/)?.[1]}}
export async function readOdyssey(signal?:AbortSignal){
 try{return snapshot(await parseBackgroundHtml<Schedule>('odyssey',await backgroundHtml(urls.odyssey)))}
 catch(e){if(!/signed.out|expected-html/.test(e instanceof Error?e.message:String(e)))throw e}
 // A browser navigation can renew the normal school session without asking for
 // credentials. It stays inactive and belongs to this job, never to the user.
 return withTemporaryTab(urls.odyssey,async page=>{
  await autoLogin('odyssey',page.id,page.check);page.check();
  const [result]=await withTimeout(chrome.scripting.executeScript({target:{tabId:page.id},func:()=>{
   if(location.hostname!=='odyssey.uwaterloo.ca')throw Error('sign-in-required');
   return {heading:document.querySelector('h1')?.textContent||'',rows:[...document.querySelectorAll('main table tr')].map(r=>[...r.querySelectorAll('th,td')].flatMap(c=>Array(Math.min(100,Math.max(1,Number(c.getAttribute('colspan')||1)))).fill('').map((_,i)=>i===0?c.textContent?.trim()||'':'')))};
  }}),5000);page.check();if(!result?.result)throw Error('parse');return snapshot(result.result);
 },{signal,timeout:45000});
}
