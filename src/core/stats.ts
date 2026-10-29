// Opt-in, anonymous "this install was used today" counter. Nothing is sent unless the user turns it on AND a server
// URL has been configured below (see stats-worker/README.md). What is sent is exactly `usageBody`: no courses, grades,
// dates, accounts or browsing data.
export const STATS_ENDPOINT='';
export const statsConfigured=()=>/^https:\/\/[^/]+\/ping$/.test(STATS_ENDPOINT);
export interface UsageStats {enabled:boolean;id?:string;lastPing?:string}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const utcDay=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export function isUsageStats(value:unknown):value is UsageStats{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return Object.keys(v).every(k=>['enabled','id','lastPing'].includes(k))&&typeof v.enabled==='boolean'&&(v.id===undefined||typeof v.id==='string'&&UUID.test(v.id))&&(v.lastPing===undefined||typeof v.lastPing==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.lastPing));
}
export const usageBody=(id:string,version:string)=>({id,version});
// Returns the updated stats when a ping was accepted, otherwise null (disabled, already sent today, or the request failed).
export async function sendUsagePing(stats:UsageStats|undefined,version:string,now=Date.now(),post:typeof fetch=fetch,endpoint=STATS_ENDPOINT):Promise<UsageStats|null>{
 if(!stats?.enabled||!stats.id||!/^https:\/\/[^/]+\/ping$/.test(endpoint))return null;
 const day=utcDay(now);if(stats.lastPing===day)return null;
 try{
  const r=await post(endpoint,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify(usageBody(stats.id,version)),cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
  return r.ok?{...stats,lastPing:day}:null;
 }catch{return null}
}
