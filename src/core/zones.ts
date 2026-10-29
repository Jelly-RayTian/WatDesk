const featured=['America/Toronto','America/Vancouver','America/Edmonton','America/Winnipeg','America/Halifax','America/St_Johns','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','UTC','Europe/London','Europe/Paris','Europe/Berlin','Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Asia/Tokyo','Asia/Seoul','Asia/Singapore','Asia/Kolkata','Asia/Dubai','Australia/Sydney','Pacific/Auckland'];
const supported=()=>{try{return (Intl as unknown as {supportedValuesOf?:(k:string)=>string[]}).supportedValuesOf?.('timeZone')??[]}catch{return[]}};
const offset=(zone:string,at:Date)=>{try{return new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(at).find(p=>p.type==='timeZoneName')?.value.replace('GMT','UTC')||''}catch{return''}};
const valid=(zone:string)=>{try{new Intl.DateTimeFormat('en',{timeZone:zone});return true}catch{return false}};
export interface ZoneOption {value:string;label:string;hint:string}
export function zoneOptions(selected:string,campusLabel:string,localLabel:string,at=new Date()):ZoneOption[]{
 const local=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return''}})();
 const ordered=[...new Set([selected,'America/Toronto',local,...featured,...supported()].filter(z=>!!z&&valid(z)))];
 return ordered.map(z=>({value:z,label:z==='America/Toronto'?`${campusLabel} · Toronto`:z===local?`${localLabel} · ${z.replace(/_/g,' ')}`:z.replace(/_/g,' '),hint:offset(z,at)}));
}
