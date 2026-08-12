import { STEPS, type StepId } from './steps';

export interface ResumePoint {
  step: number;
  label: string;
  href: string;
}

export function resumePoint(isResuming: boolean, stepId: StepId): ResumePoint {
  const index = isResuming ? STEPS.findIndex((step) => step.id === stepId) : 0;
  // A stepId written by an older build is no longer in STEPS; findIndex gives
  // -1, and "Step 0 of 5" is worse than starting over.
  const step = index < 0 ? 1 : index + 1;

  return {
    step,
    label: STEPS[step - 1].label,
    href: step > 1 ? `/onboarding?step=${step}` : '/onboarding',
  };
}
