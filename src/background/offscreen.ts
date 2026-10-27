import {parseHtml} from './html-parser';
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.target!=='offscreen'||sender.id!==chrome.runtime.id||sender.tab||sender.url&&!sender.url.startsWith(chrome.runtime.getURL('')))return false;
 if(msg.kind==='pdf-text'){
  if(!Array.isArray(msg.bytes)||msg.bytes.length>2000000||!msg.bytes.every((b:unknown)=>typeof b==='number'&&Number.isInteger(b)&&b>=0&&b<=255)){respond({ok:false,error:'invalid-pdf-data'});return false}
  void import('./pdf-text').then(({extractPdfText})=>extractPdfText(new Uint8Array(msg.bytes))).then(value=>respond({ok:true,value}),e=>respond({ok:false,error:e instanceof Error?e.message:String(e)}));return true;
 }
 try{respond({ok:true,value:parseHtml(msg.kind,msg.html)})}catch(e){respond({ok:false,error:e instanceof Error?e.message:String(e)})}return false;
});
