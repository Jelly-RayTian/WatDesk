// Runs only after the user grants the Waterloo SSO host permission.
(()=>{
 if(location.protocol!=='https:'||location.hostname!=='adfs.uwaterloo.ca'||!/^\/adfs\/ls(?:\/|$)/i.test(location.pathname))return;
 if(document.documentElement.dataset.watdeskSchoolLogin)return;
 document.documentElement.dataset.watdeskSchoolLogin='watching';
 let timer,deadline,observer,stopped=false;
 const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getClientRects().length>0;
 const stop=()=>{stopped=true;clearInterval(timer);clearTimeout(deadline);observer?.disconnect();document.removeEventListener('input',check,true);document.removeEventListener('change',check,true)};
 const check=()=>{
  if(stopped)return;
  if(document.documentElement.dataset.watdeskSchoolLogin==='clicked'){stop();return}
  // Never inspect password/verification values or submit those steps.
  if([...document.querySelectorAll('input[type="password"],input[autocomplete="one-time-code"],#errorText,[role="alert"]')].some(el=>visible(el)&&(el.matches('input')||el.textContent.trim()))){stop();return}
  const user=document.querySelector('#userNameInput,input[name="UserName"],input[autocomplete="username"],input[type="email"]');
  if(!visible(user)||!/^\s*[^@\s]+@uwaterloo\.ca\s*$/i.test(user.value||''))return;
  const next=[...document.querySelectorAll('#nextButton,button,input[type="submit"],input[type="button"],[role="button"]')].find(el=>visible(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&/^(next|下一步)$/i.test((el.getAttribute('aria-label')||el.value||el.textContent||'').trim()));
  if(!next)return;
  const form=next.form||next.closest("form");
  if(form?.action){try{const action=new URL(form.action,location.href);if(action.protocol!=='https:'||action.hostname!=='adfs.uwaterloo.ca')return}catch{return}}
  document.documentElement.dataset.watdeskSchoolLogin='clicked';stop();next.click();
 };
 document.addEventListener('input',check,true);document.addEventListener('change',check,true);
 observer=new MutationObserver(check);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','style','value']});
 window.addEventListener("pagehide",stop,{once:true});
 window.addEventListener("watdesk-school-login-stop",stop,{once:true});
 timer=setInterval(check,400);deadline=setTimeout(stop,45000);check();
})();
