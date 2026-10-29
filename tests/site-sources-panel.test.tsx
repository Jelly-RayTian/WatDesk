// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {SourcePanel} from '../src/ui/SourceStatus';
import {emptyState} from '../src/domain';
async function mount(state:ReturnType<typeof emptyState>,props:Partial<Parameters<typeof SourcePanel>[0]>={}){
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const fns={enableSite:vi.fn(),disableSite:vi.fn(),retry:vi.fn(),open:vi.fn(),toggleCs135:vi.fn(),toggleMobius:vi.fn()};
 await act(async()=>root.render(<SourcePanel state={state} {...fns} {...props}/>));
 return {host,fns,done:()=>act(async()=>root.unmount())};
}
it('offers each readable course website as an optional source and enables it from the list',async()=>{
 const {host,fns,done}=await mount(emptyState());
 const row=[...host.querySelectorAll('.source-row')].find(r=>r.textContent?.includes('CS 145'))!;
 expect(row.textContent).toContain('Optional');
 await act(async()=>{(row.querySelector('button.text-button') as HTMLButtonElement).click()});
 expect(fns.enableSite).toHaveBeenCalledWith('cs145');await done();
});
it('shows an enabled course as its own source with its read count and a disable button',async()=>{
 const s=emptyState();s.settings.courseSites=['cs241'];s.sources.sites={status:'ok',at:'2026-10-29T15:00:00Z',count:5};
 s.entries=[1,2,3].map(n=>({id:`sites:cs241:assignment-${n}`,platform:'sites' as const,course:'CS 241',title:`Assignment ${n}`,type:'task' as const,start:null,end:null,due:'2026-11-09T22:00:00Z',status:'open' as const,url:''}));
 const {host,fns,done}=await mount(s);
 const row=[...host.querySelectorAll('.source-row')].find(r=>r.querySelector('b')?.textContent==='CS 241')!;
 expect(row.textContent).toContain('Read 3 items');
 await act(async()=>{(row.querySelector('.source-toggle') as HTMLButtonElement).click()});
 expect(fns.disableSite).toHaveBeenCalledWith('cs241');
 await act(async()=>{(row.querySelector('button.icon-button') as HTMLButtonElement).click()});
 expect(fns.retry).toHaveBeenCalledWith('sites');await done();
});
it('shows why one course failed and when permission is missing',async()=>{
 const s=emptyState();s.settings.courseSites=['cs241','cs240'];s.sources.sites={status:'ok',at:'2026-10-29T15:00:00Z',error:'sites-partial:cs240=http-404'};
 let {host,done}=await mount(s);
 expect(host.textContent).toContain('Read failed: http-404');await done();
 const p=emptyState();p.settings.courseSites=['cs241'];p.sources.sites={status:'error',error:'permission'};
 ({host,done}=await mount(p));expect(host.textContent).toContain('Needs permission');await done();
});
it('lists what was read for a course and shows link-only courses as sources too',async()=>{
 const s=emptyState();s.settings.courseSites=['cs241','cs116'];s.sources.sites={status:'ok',at:'2026-10-29T15:00:00Z',count:1};
 s.entries=[{id:'sites:cs241:assignment-5',platform:'sites',course:'CS 241',title:'Assignment 5',type:'task',start:null,end:null,due:'2026-11-09T22:00:00Z',status:'open',url:''}];
 const {host,done}=await mount(s);
 const read=host.querySelector('.site-read-list')!;
 expect(read.textContent).toContain('Assignment 5');expect(read.textContent).toContain('What was read · 1');
 const link=[...host.querySelectorAll('.source-row')].find(r=>r.querySelector('b')?.textContent==='CS 116')!;
 expect(link.textContent).toContain('Link only');expect(link.querySelector('a')?.getAttribute('href')).toBe('https://student.cs.uwaterloo.ca/~cs116/');
 expect(host.querySelector('.source-panel .small')?.textContent).toContain('Enabled 5');await done();
});
