import {copyFile,mkdir,cp} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
await mkdir('dist',{recursive:true});
await copyFile('src/vendor/watnow/content/crowdmark-bridge.js','dist/crowdmark-bridge.js');
await copyFile('src/content/school-login.js','dist/school-login.js');
await copyFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs','dist/pdf.worker.mjs');
await cp('node_modules/pdfjs-dist/standard_fonts','dist/standard_fonts',{recursive:true});
await copyFile('node_modules/pdfjs-dist/LICENSE','dist/PDFjs-LICENSE.txt');
await copyFile('manifest.json','dist/manifest.json');
await copyFile('THIRD_PARTY_NOTICES.md','dist/THIRD_PARTY_NOTICES.md');
await copyFile('src/vendor/watnow/LICENSE','dist/WATnow-LICENSE.txt');
// Original raster mark. No remote fonts, artwork, or runtime CDN dependencies.
function crc(b){let v=0xffffffff;for(const n of b){v^=n;for(let j=0;j<8;j++)v=(v>>>1)^((v&1)?0xedb88320:0)}return (v^0xffffffff)>>>0}
function chunk(t,b){const out=Buffer.alloc(b.length+12);out.writeUInt32BE(b.length);out.write(t,4);b.copy(out,8);out.writeUInt32BE(crc(out.subarray(4,-4)),out.length-4);return out}
// Same mark rendered at each size the stores and toolbar ask for (supersampled for small sizes).
function icon(size){
 const raw=Buffer.alloc((size*4+1)*size),k=size/128,N=4;
 const segs=[[29,37,44,91],[44,91,64,50],[64,50,84,91],[84,91,99,37]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*(size*4+1)+1+x*4;let acc=[0,0,0];
  for(let sy=0;sy<N;sy++)for(let sx=0;sx<N;sx++){
   const X=(x+(sx+.5)/N)/k,Y=(y+(sy+.5)/N)/k;let c=[245,243,237];
   for(const [a,b,cx,d] of segs){const t=Math.max(0,Math.min(1,((X-a)*(cx-a)+(Y-b)*(d-b))/((cx-a)**2+(d-b)**2)));if(Math.hypot(X-a-t*(cx-a),Y-b-t*(d-b))<5.5)c=[29,45,37]}
   if(Math.hypot(X-104,Y-24)<9)c=[232,201,101];
   acc=acc.map((v,n)=>v+c[n]);
  }
  raw.set([...acc.map(v=>Math.round(v/(N*N))),255],i);
 }
 const head=Buffer.alloc(13);head.writeUInt32BE(size);head.writeUInt32BE(size,4);head[8]=8;head[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const {writeFile}=await import('node:fs/promises');
for(const size of [16,32,48,128])await writeFile(size===128?'dist/icon.png':`dist/icon-${size}.png`,icon(size));
