import type {Settings,Overlay} from '../domain';
export const settingKeys=['syncIntervalMinutes','activeTerm','classMeetings','courseReminders','hiddenCourses','gradePlans','cs135Enabled','mobiusEnabled','onboardingComplete','visualVersion','locale','theme','palette','zone','taskLead','examLeads','notifications','mutedCourses'] satisfies (keyof Settings)[];
const overlayKeys=['keepSeparate','done','note','hidden','linkedTo'] satisfies (keyof Overlay)[];
function pick(patch:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('invalid');
 return Object.fromEntries(Object.entries(patch).filter(([k])=>keys.includes(k)));
}
// Check before JSON serialization: undefined and non-finite numbers otherwise vanish or become null.
function jsonValue(value:unknown):boolean{
 if(value===null||typeof value==='string'||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(Array.isArray(value))return Array.from(value).every(jsonValue);
 return !!value&&typeof value==='object'&&Object.entries(value).every(([key,v])=>!['__proto__','constructor','prototype'].includes(key)&&jsonValue(v));
}
export function settingsPatch(patch:unknown):Partial<Settings>{const next=pick(patch,settingKeys);if(!jsonValue(next))throw Error('invalid');return next as Partial<Settings>}
export function overlayPatch(patch:unknown):Partial<Overlay>{
 const next=pick(patch,overlayKeys);
 for(const [key,value] of Object.entries(next)){
  if(key==='linkedTo'&&value===null){next[key]=undefined;continue}
  if(typeof value!==(key==='note'||key==='linkedTo'?'string':'boolean'))throw Error('invalid');
 }
 return next as Partial<Overlay>;
}
