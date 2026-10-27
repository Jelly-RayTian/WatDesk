import {parseHtml} from './html-parser';
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(msg?.target!=='offscreen'||sender.id!==chrome.runtime.id||sender.tab||sender.url&&!sender.url.startsWith(chrome.runtime.getURL('')))return false;
 try{respond({ok:true,value:parseHtml(msg.kind,msg.html)})}catch(e){respond({ok:false,error:e instanceof Error?e.message:String(e)})}return false;
});
