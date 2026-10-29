import {platforms,type AppState,type Platform} from '../domain';
import {readableSiteIds} from './course-sites';
export const needsOnboarding=(s:AppState)=>!s.settings.onboardingComplete;
export const enabledPlatforms=(s:AppState):Exclude<Platform,'manual'>[]=>platforms.filter(p=>p!=='sites'&&(p!=='cs135'||s.settings.cs135Enabled===true)&&(p!=='mobius'||s.settings.mobiusEnabled===true));
export const enabledConnectPlatforms=(s:AppState)=>enabledPlatforms(s).filter((p):p is Exclude<Platform,'manual'|'sites'>=>p!=='sites');
export const connectionProgress=(s:AppState)=>enabledPlatforms(s).filter(p=>s.sources[p]?.status==='ok').length;
export const sitesEnabled=(s:AppState)=>(s.settings.courseSites??[]).some(id=>readableSiteIds([id]).length>0);
