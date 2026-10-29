// Usage: node tools/set-stats-endpoint.mjs https://watdesk-stats.<account>.workers.dev/ping
import {readFile,writeFile} from 'node:fs/promises';
const endpoint=process.argv[2]||'';
if(!/^https:\/\/[^/\s]+\/ping$/.test(endpoint)){console.error('Pass an https URL ending in /ping');process.exit(1)}
const origin=new URL(endpoint).origin;
const stats=await readFile('src/core/stats.ts','utf8');
await writeFile('src/core/stats.ts',stats.replace(/export const STATS_ENDPOINT='[^']*';/,`export const STATS_ENDPOINT='${endpoint}';`));
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
const csp=manifest.content_security_policy.extension_pages;
if(!csp.includes(origin))manifest.content_security_policy.extension_pages=csp.replace(/connect-src ([^;]*)/,(_m,rest)=>`connect-src ${rest} ${origin}`);
await writeFile('manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Stats endpoint set to ${endpoint}`);
