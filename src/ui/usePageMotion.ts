import {useEffect,useLayoutEffect,useRef} from 'react';

export function usePageMotion(page:string,ready:boolean){
 const content=useRef<HTMLDivElement>(null),previous=useRef(page),keyboard=useRef(false);
 useEffect(()=>{
  const key=()=>{keyboard.current=true},pointer=()=>{keyboard.current=false};
  document.addEventListener('keydown',key,true);document.addEventListener('pointerdown',pointer,true);
  return()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',pointer,true)};
 },[]);
 useLayoutEffect(()=>{
  if(!ready||previous.current===page)return;previous.current=page;
  window.scrollTo({top:0,behavior:'instant'});
  const node=content.current;if(!node||keyboard.current||!node.animate)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation=node.animate(reduced?[{opacity:.65},{opacity:1}]:[{opacity:.35,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:reduced?80:200,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});
  return()=>animation.cancel();
 },[page,ready]);
 return content;
}
