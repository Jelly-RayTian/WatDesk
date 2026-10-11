// Platforms remain sequential. Only independent courses within Learn overlap.
// Warm shared feeds first: the upstream reader caches values, not in-flight promises.
export async function readLearnCourses<C,T>(source:{ensureFeed():Promise<unknown>;ensureCalendar():Promise<unknown>;listDeadlines(course:C):Promise<T>},courses:C[]):Promise<PromiseSettledResult<T>[]>{
 if(!courses.length)return [];
 await source.ensureFeed();await source.ensureCalendar();
 const results:PromiseSettledResult<T>[]=new Array(courses.length);let next=0;
 async function worker(){while(next<courses.length){const index=next++;try{results[index]={status:'fulfilled',value:await source.listDeadlines(courses[index])}}catch(reason){results[index]={status:'rejected',reason}}}}
 await Promise.all(Array.from({length:Math.min(2,courses.length)},()=>worker()));return results;
}
