import {copyFile,mkdir} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
await mkdir('dist',{recursive:true});
await copyFile('src/vendor/watnow/content/crowdmark-bridge.js','dist/crowdmark-bridge.js');
await copyFile('manifest.json','dist/manifest.json');
await copyFile('THIRD_PARTY_NOTICES.md','dist/THIRD_PARTY_NOTICES.md');
await copyFile('src/vendor/watnow/LICENSE','dist/WATnow-LICENSE.txt');
// Original raster mark. No remote fonts, artwork, or runtime CDN dependencies.
const size=128,raw=Buffer.alloc((size*4+1)*size);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const i=y*(size*4+1)+1+x*4;let c=[232,240,252,255];
 const segs=[[29,37,44,91],[44,91,64,50],[64,50,84,91],[84,91,99,37]];
 for(const [a,b,cx,d] of segs){const t=Math.max(0,Math.min(1,((x-a)*(cx-a)+(y-b)*(d-b))/((cx-a)**2+(d-b)**2)));if(Math.hypot(x-a-t*(cx-a),y-b-t*(d-b))<5)c=[49,94,157,255]}
 if(Math.hypot(x-104,y-24)<9)c=[244,202,73,255];raw.set(c,i);
}
function crc(b){let v=0xffffffff;for(const n of b){v^=n;for(let j=0;j<8;j++)v=(v>>>1)^((v&1)?0xedb88320:0)}return (v^0xffffffff)>>>0}
function chunk(t,b){const out=Buffer.alloc(b.length+12);out.writeUInt32BE(b.length);out.write(t,4);b.copy(out,8);out.writeUInt32BE(crc(out.subarray(4,-4)),out.length-4);return out}
const head=Buffer.alloc(13);head.writeUInt32BE(size);head.writeUInt32BE(size,4);head[8]=8;head[9]=6;
const {writeFile}=await import('node:fs/promises');await writeFile('dist/icon.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
