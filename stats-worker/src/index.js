// WatDesk anonymous usage counter (Cloudflare Worker + KV).
// POST /ping  body {"id":"<uuid>","version":"1.2.3"}  -> records "this install was active today" (day is set by the server).
// GET  /summary (Authorization: Bearer <STATS_TOKEN>) -> daily and monthly active installs, plus a version breakdown.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VERSION=/^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
const reply=(body,status=200,extra={})=>new Response(body,{status,headers:{...cors,...extra}});
const today=()=>new Date().toISOString().slice(0,10);
function safeEqual(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return reply(null,204);
  if(request.method==='POST'&&url.pathname==='/ping'){
   const text=await request.text();if(text.length>200)return reply('too large',413);
   let body;try{body=JSON.parse(text)}catch{return reply('bad request',400)}
   if(!body||typeof body.id!=='string'||!UUID.test(body.id)||typeof body.version!=='string'||!VERSION.test(body.version))return reply('bad request',400);
   // One key per install per day; repeated pings overwrite it, so they never inflate the count.
   await env.STATS.put(`d:${today()}:${body.id}`,'1',{metadata:{v:body.version},expirationTtl:60*60*24*400});
   return reply('ok');
  }
  if(request.method==='GET'&&url.pathname==='/summary'){
   const auth=request.headers.get('authorization')||'';
   if(!env.STATS_TOKEN||!safeEqual(auth,`Bearer ${env.STATS_TOKEN}`))return reply('unauthorized',401);
   const days={},month=new Set(),versions={};const since=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
   let cursor;
   do{
    const page=await env.STATS.list({prefix:'d:',cursor});
    for(const k of page.keys){
     const [,day,id]=k.name.split(':');days[day]=(days[day]||0)+1;
     if(day>=since){month.add(id);if(day===today()){const v=k.metadata?.v||'?';versions[v]=(versions[v]||0)+1}}
    }
    cursor=page.list_complete?undefined:page.cursor;
   }while(cursor);
   return reply(JSON.stringify({today:days[today()]||0,activeLast30Days:month.size,versionsToday:versions,daily:Object.fromEntries(Object.entries(days).sort())},null,2),200,{'content-type':'application/json','cache-control':'no-store'});
  }
  return reply('not found',404);
 }
};
