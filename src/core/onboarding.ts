import {platforms,type AppState} from '../domain';
export const needsOnboarding=(s:AppState)=>!s.settings.onboardingComplete;
export const enabledPlatforms=(s:AppState)=>platforms.filter(p=>(p!=='cs135'||s.settings.cs135Enabled===true)&&(p!=='mobius'||s.settings.mobiusEnabled===true));
export const connectionProgress=(s:AppState)=>enabledPlatforms(s).filter(p=>s.sources[p]?.status==='ok').length;
