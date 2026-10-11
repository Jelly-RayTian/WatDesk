import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SyncProgress} from '../src/ui/SyncProgress';
import {BackgroundSync} from '../src/ui/SourceStatus';
import {emptyState} from '../src/domain';

it('counts only completed sources while an unknown-duration read is animated',()=>{
 const html=renderToStaticMarkup(<SyncProgress targets={['learn','crowdmark','odyssey']} completed={['learn']} active="crowdmark" zh/>);
 expect(html).toContain('aria-valuenow="1"');
 expect(html).toContain('aria-valuemax="3"');
 expect(html).toContain('sync-progress-segment reading');
 expect(html).toContain('1/3 · Crowdmark');
});
it('keeps a failure distinct from a successful completion',()=>{
 const html=renderToStaticMarkup(<SyncProgress targets={['learn','crowdmark']} completed={['learn']} failed="crowdmark" zh={false}/>);
 expect(html).toContain('aria-valuenow="1"');
 expect(html).toContain('sync-progress-segment failed');
 expect(html).not.toContain('sync-progress-segment reading');
});
it('shows progress for a manual connection before any background run exists',()=>{
 const state=emptyState('zh-CN');state.sources.crowdmark={status:'syncing',phase:'grades'};
 const html=renderToStaticMarkup(<BackgroundSync state={state} retry={()=>{}} details={()=>{}}/>);
 expect(html).toContain('Crowdmark · 读取历史成绩');
 expect(html).toContain('aria-valuenow="0"');
 expect(html).toContain('sync-progress-segment reading');
});

it('animates every concurrent source while counting only completed platforms',()=>{
 const state=emptyState('zh-CN');state.syncRun={started:Date.now(),targets:['learn','crowdmark','odyssey'],completed:['odyssey'],finished:false};
 state.sources.learn={status:'syncing',phase:'tasks'};state.sources.crowdmark={status:'ok',phase:'grades'};state.sources.odyssey={status:'ok'};
 const html=renderToStaticMarkup(<BackgroundSync state={state} retry={()=>{}} details={()=>{}}/>);
 expect(html).toContain('2 个平台同时读取中');expect(html.match(/sync-progress-segment reading/g)).toHaveLength(2);expect(html).toContain('aria-valuenow="1"');
});
