import type { OnboardingState } from '@semble/types';
import { resumeStep } from './resumeStep';
import { STEPS } from './steps';

export interface ResumePoint {
  step: number;
  label: string;
  href: string;
}

/**
 * Someone who has not started reads as stage 1 whatever their record holds, so
 * a row left by an abandoned run cannot drop a first-timer into the middle of
 * the flow.
 */
export function resumePoint(
  isResuming: boolean,
  state: OnboardingState | null | undefined,
): ResumePoint {
  const step = isResuming ? resumeStep(state) : 1;

  return {
    step,
    label: STEPS[step - 1].label,
    href: step > 1 ? `/onboarding?step=${step}` : '/onboarding',
  };
}
