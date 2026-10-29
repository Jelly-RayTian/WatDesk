import {useEffect,useId,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import {CaretDown,Check,MagnifyingGlass} from '@phosphor-icons/react';
export interface PickerOption {value:string;label:string;hint?:string}
interface Props {value:string;options:PickerOption[];onChange:(value:string)=>void;label:string;searchable?:boolean;searchPlaceholder?:string;noMatch?:string;className?:string}
export function Picker({value,options,onChange,label,searchable=false,searchPlaceholder='Search',noMatch='No match',className=''}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0),[up,setUp]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null),list=useRef<HTMLUListElement>(null);
 const id=useId();
 const current=options.find(o=>o.value===value);
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return q?options.filter(o=>`${o.label} ${o.hint||''} ${o.value}`.toLowerCase().includes(q)):options},[options,query]);
 const close=(refocus=true)=>{setOpen(false);if(refocus)trigger.current?.focus()};
 const choose=(o:PickerOption)=>{onChange(o.value);close()};
 useEffect(()=>{if(!open)return;const away=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',away);return()=>document.removeEventListener('pointerdown',away)},[open]);
 useEffect(()=>{if(!open)return;setQuery('');setActive(Math.max(0,options.findIndex(o=>o.value===value)));const rect=trigger.current?.getBoundingClientRect();if(rect)setUp(window.innerHeight-rect.bottom<300&&rect.top>window.innerHeight-rect.bottom);if(searchable)setTimeout(()=>search.current?.focus())},[open]);
 useEffect(()=>{setActive(0)},[query]);
 useEffect(()=>{if(open)(list.current?.querySelector('[data-active=true]') as HTMLElement|null)?.scrollIntoView?.({block:'nearest'})},[active,open,shown]);
 const key=(e:KeyboardEvent)=>{
  if(!open){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true)}return}
  if(e.key==='Escape'){e.preventDefault();close()}
  else if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>Math.min(shown.length-1,i+1))}
  else if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,i-1))}
  else if(e.key==='Home'){e.preventDefault();setActive(0)}
  else if(e.key==='End'){e.preventDefault();setActive(shown.length-1)}
  else if(e.key==='Enter'&&shown[active]){e.preventDefault();choose(shown[active])}
  else if(e.key==='Tab')setOpen(false);
 };
 return <div className={`picker ${open?'open':''} ${className}`} ref={root} onKeyDown={key}>
  <button type="button" ref={trigger} className="picker-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={label} aria-controls={open?id:undefined} onClick={()=>setOpen(o=>!o)}><span>{current?.label??value}</span><CaretDown size={14} weight="bold" aria-hidden="true"/></button>
  {open&&<div className={`picker-pop ${up?'up':''}`}>
   {searchable&&<label className="picker-search"><MagnifyingGlass size={15} aria-hidden="true"/><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} role="combobox" aria-expanded="true" aria-controls={id} aria-activedescendant={shown[active]?`${id}-${active}`:undefined}/></label>}
   <ul ref={list} id={id} role="listbox" aria-label={label} tabIndex={-1}>
    {shown.map((o,i)=><li key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value===value} data-active={i===active} onPointerMove={()=>setActive(i)} onClick={()=>choose(o)}><span className="picker-label">{o.label}</span>{o.hint&&<small>{o.hint}</small>}{o.value===value&&<Check size={14} weight="bold" aria-hidden="true"/>}</li>)}
    {!shown.length&&<li className="picker-empty" aria-disabled="true">{noMatch}</li>}
   </ul>
  </div>}
 </div>;
}
