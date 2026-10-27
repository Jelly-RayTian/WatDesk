import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {extractPdfText} from '../src/background/pdf-text';
beforeEach(()=>vi.stubGlobal('chrome',{runtime:{getURL:(path:string)=>path==='pdf.worker.mjs'?new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href:new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url).pathname}}));
afterEach(()=>vi.unstubAllGlobals());
function fixture(text:string){
 const content=`BT /F1 12 Tf 50 750 Td (${text.replace(/[\\()]/g,'\\$&')}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF`;return new TextEncoder().encode(pdf);
}
it('extracts actual PDF bytes locally with the matching PDF.js worker',async()=>{
 const text=await extractPdfText(fixture('Assignment W1 due September 16, 2026 at 4:05 PM'));expect(text).toContain('Assignment W1 due September 16, 2026 at 4:05 PM');
});
it('rejects PDFs with no text instead of reporting an empty successful schedule',async()=>{
 await expect(extractPdfText(fixture(''))).rejects.toThrow('pdf-no-text');
});
