import type {Settings} from '../domain';
export function syncMinutes(settings:Settings){return settings.syncIntervalMinutes??360}
// Preserve the next run on worker restarts; changing the setting restarts the interval.
let configuring:Promise<void>=Promise.resolve();
export function configureSyncSchedule(settings:Settings):Promise<void>{
 const minutes=syncMinutes(settings);
 const job=configuring.then(async()=>{
  if(minutes===0){await chrome.alarms.clear('sync');return}
  const previous=await chrome.alarms.get('sync');
  if(previous?.periodInMinutes!==minutes)await chrome.alarms.create('sync',{periodInMinutes:minutes});
 });configuring=job.catch(()=>{});return job;
}
