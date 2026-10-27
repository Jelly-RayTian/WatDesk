import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
// Bundled parser + worker only. PDF actions, scripts, fonts and network assets are not executed.
export async function extractPdfText(bytes:Uint8Array):Promise<string>{
 if(bytes.length>2000000)throw Error('pdf-too-large');
 if(typeof chrome!=='undefined'&&chrome.runtime?.getURL)GlobalWorkerOptions.workerSrc=chrome.runtime.getURL('pdf.worker.mjs');
 const task=getDocument({data:bytes,standardFontDataUrl:typeof chrome!=='undefined'&&chrome.runtime?.getURL?chrome.runtime.getURL('standard_fonts/'):undefined,disableFontFace:true,useSystemFonts:false,useWorkerFetch:false,useWasm:false,enableXfa:false});
 try{
  const pdf=await task.promise;if(pdf.numPages>20)throw Error('pdf-too-many-pages');
  const pages:string[]=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);const content=await page.getTextContent();
   pages.push(content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join(''));page.cleanup();
   if(pages.reduce((size,value)=>size+value.length,0)>2000000)throw Error('pdf-text-too-large');
  }
  const text=pages.join('\n');if(!text.trim())throw Error('pdf-no-text');return text;
 }finally{await task.destroy()}
}
