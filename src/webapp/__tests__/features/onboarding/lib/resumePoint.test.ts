import { describe, expect, it } from 'vitest';
import type { OnboardingState } from '@semble/types';
import { resumePoint } from '@/features/onboarding/lib/resumePoint';
import { resumeStep } from '@/features/onboarding/lib/resumeStep';

function state(fields: Partial<OnboardingState> = {}): OnboardingState {
  return { userId: 'did:plc:test', updatedAt: new Date(0), ...fields };
}

describe('resumeStep', () => {
  it('starts at stage 1 when nothing has been answered', () => {
    expect(resumeStep(state())).toBe(1);
  });

  it('treats a missing record as the start', () => {
    expect(resumeStep(null)).toBe(1);
  });

  it('counts a skipped stage as reached, so an empty array still advances', () => {
    expect(resumeStep(state({ intention: [] }))).toBe(2);
    expect(resumeStep(state({ intention: [], topicsSelected: [] }))).toBe(3);
  });

  it('advances a rung per answered stage', () => {
    expect(resumeStep(state({ intention: ['discovery'] }))).toBe(2);
    expect(resumeStep(state({ topicsSelected: ['ai'] }))).toBe(3);
    expect(resumeStep(state({ linksSelected: ['https://a.test'] }))).toBe(4);
    expect(resumeStep(state({ followedAccounts: ['did:plc:x'] }))).toBe(5);
  });

  it('reaches the last stage on collections alone, not just accounts', () => {
    expect(resumeStep(state({ followedCollections: ['uuid'] }))).toBe(5);
  });

  it('is not blocked by a gap, so a cleared middle stage cannot strand anyone', () => {
    expect(
      resumeStep(state({ intention: ['discovery'], linksSelected: [] })),
    ).toBe(4);
  });
});

describe('resumePoint', () => {
  it('sends a first-timer to the start, whatever the record holds', () => {
    expect(resumePoint(false, state({ linksSelected: [] }))).toEqual({
      step: 1,
      label: 'About you',
      href: '/onboarding',
    });
  });

  it('resumes the furthest stage reached', () => {
    expect(resumePoint(true, state({ topicsSelected: ['ai'] }))).toEqual({
      step: 3,
      label: 'Cards',
      href: '/onboarding?step=3',
    });
  });

  it('omits the query for stage 1, which /onboarding already is', () => {
    expect(resumePoint(true, state())).toEqual({
      step: 1,
      label: 'About you',
      href: '/onboarding',
    });
  });
});
