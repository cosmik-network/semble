import { describe, expect, it } from 'vitest';
import { resumePoint } from '@/features/onboarding/lib/resumePoint';
import type { StepId } from '@/features/onboarding/lib/steps';

describe('resumePoint', () => {
  it('sends a first-timer to the start, whatever is in storage', () => {
    expect(resumePoint(false, 'follow')).toEqual({
      step: 1,
      label: 'About you',
      href: '/onboarding',
    });
  });

  it('resumes a stored mid-flow stage', () => {
    expect(resumePoint(true, 'cards')).toEqual({
      step: 3,
      label: 'Cards',
      href: '/onboarding?step=3',
    });
  });

  it('omits the query for stage 1, which /onboarding already is', () => {
    expect(resumePoint(true, 'about')).toEqual({
      step: 1,
      label: 'About you',
      href: '/onboarding',
    });
  });

  it('falls back to stage 1 for a stepId that is no longer in STEPS', () => {
    expect(resumePoint(true, 'retired-stage' as StepId)).toEqual({
      step: 1,
      label: 'About you',
      href: '/onboarding',
    });
  });
});
