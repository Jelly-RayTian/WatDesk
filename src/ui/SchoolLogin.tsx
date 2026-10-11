import {useEffect,useState} from 'react';
import type {AppState} from '../domain';
const origin='https://adfs.uwaterloo.ca/*';
export function SchoolLogin({state,perform}:{state:AppState;perform:(type:string,args?:object)=>Promise<any>}){
 const zh=state.settings.locale==='zh-CN';const [granted,setGranted]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{void chrome.permissions.contains({origins:[origin]}).then(setGranted)},[]);
 const enabled=granted&&state.settings.schoolAutoNext===true;
 async function toggle(){setBusy(true);setError('');try{if(!enabled){if(!await chrome.permissions.request({origins:[origin]})){setError(zh?'未授权，学校登录页仍由你手动继续。':'Permission was not granted. Continue manually on school sign-in.');return}setGranted(true)}await perform('schoolLogin',{enabled:!enabled})}catch{setError(zh?'未能启用，请重试。':'Could not enable this. Please retry.')}finally{setBusy(false)}}
 return <section className="settings-section"><h2>{zh?'学校登录自动继续':'School sign-in helper'}</h2><p>{zh?'在滑铁卢统一登录页，账号已由你或浏览器填好时，自动点击一次 Next。不保存账号，不读取密码，也不处理验证码。':'On Waterloo SSO, click Next once when you or your browser has filled a Waterloo account. No account storage, password reading or verification automation.'}</p><button className="button secondary" disabled={busy} onClick={()=>void toggle()}>{enabled?(zh?'关闭自动继续':'Disable automatic Next'):(zh?'启用自动点击 Next':'Enable automatic Next')}</button><p className="small muted">{enabled?(zh?'已启用，今后打开学校登录页会自动检测。':'Enabled. Future school sign-in pages are detected automatically.'):(zh?'首次启用需要允许 adfs.uwaterloo.ca 网站权限。':'First enable requires permission for adfs.uwaterloo.ca.')}</p>{error&&<p className="danger" role="alert">{error}</p>}</section>;
}
