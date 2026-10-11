import {it,expect} from 'vitest';
import {emptyState} from '../src/domain';
import {needsOnboarding,connectionProgress} from '../src/core/onboarding';
it('opens connections first for new and existing installations that have not finished setup',()=>{const s=emptyState();expect(needsOnboarding(s)).toBe(true);s.sources.learn={status:'ok'};expect(needsOnboarding(s)).toBe(true);s.settings.onboardingComplete=true;expect(needsOnboarding(s)).toBe(false)});
it('counts a source as connected only after a successful read',()=>{const s=emptyState();s.sources.learn={status:'ok'};s.sources.crowdmark={status:'error'};s.sources.odyssey={status:'syncing'};expect(connectionProgress(s)).toBe(1)});
