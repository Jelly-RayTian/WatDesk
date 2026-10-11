import {it,expect,vi} from 'vitest';
import {retryFrame,withTimeout,recoverInterrupted} from '../src/core/sync';
import {emptyState} from '../src/domain';
import {parseCs135Html} from '../src/adapters/parsers';
import {readFileSync} from 'node:fs';
it('retries only a destroyed frame and preserves authentication errors',async()=>{
 const read=vi.fn().mockRejectedValueOnce(Error('Frame with ID 0 was removed.')).mockResolvedValue('ready');
 expect(await retryFrame(read,async()=>{})).toBe('ready');expect(read).toHaveBeenCalledTimes(2);
 const signedOut=vi.fn().mockRejectedValue(Error('signed-out'));await expect(retryFrame(signedOut,async()=>{})).rejects.toThrow('signed-out');expect(signedOut).toHaveBeenCalledTimes(1);
});
it('turns a never finishing read into a retryable error',async()=>{vi.useFakeTimers();const result=withTimeout(new Promise(()=>{}),100).catch(e=>e.message);await vi.advanceTimersByTimeAsync(101);expect(await result).toBe('sync-timeout');vi.useRealTimers()});
it('recovers persisted busy status after a service worker restart without discarding records',()=>{const s=emptyState();s.sources.cs135={status:'syncing'};s.sources.odyssey={status:'ok'};const next=recoverInterrupted(s);expect(next.sources.cs135.status).toBe('error');expect(next.sources.odyssey.status).toBe('ok');expect(next.entries).toEqual(s.entries)});
it('reads the actual public CS135 calendar without a browser frame',()=>{const html=readFileSync(new URL('../fixtures/cs135-calendar.html',import.meta.url),'utf8');const entries=parseCs135Html(html);expect(entries.filter(e=>e.type==='task')).toHaveLength(11);expect(entries.find(e=>e.title==='Assignment 04')?.due).toBe('2026-10-21T01:00:00Z');expect(entries.filter(e=>e.type==='exam')).toHaveLength(2)});
