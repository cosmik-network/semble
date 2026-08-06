'use client';

import { Stack } from '@mantine/core';
import { LinkAnchor } from '@/components/link/MantineLink';
import OnboardingHeader from '../onboardingHeader/OnboardingHeader';
import OnboardingScreen from '../onboardingScreen/OnboardingScreen';
import WhatNextStep from '../steps/whatNextStep/WhatNextStep';

interface Props {
  /** Clears the locally stored progress. Deliberately never touches the
   * status cookie: bailing halfway on a repeat run must not put the banner
   * back on /home. */
  onStartOver: () => void;
  /** Writes status 'completed' before the browser follows an exit link. */
  onComplete: () => void;
}

/**
 * What a user who already completed or dismissed onboarding sees at
 * `/onboarding`. Same WhatNextStep as stage 4 of the flow, just without a
 * stepper (nothing here is "in progress") or a footer (no Back/Continue
 * outside the flow).
 */
export default function ReturningView(props: Props) {
  return (
    <OnboardingScreen
      header={
        <OnboardingHeader
          // No stepper: nothing here is in progress.
          //
          // "Back to home", not "Go home": the exit link below also reads
          // "Go home" but writes status 'completed'. Two controls with the
          // same label and different consequences on one screen is a trap.
          exitLabel="Back to home"
          onExit={() => {}}
        />
      }
    >
      <Stack gap={'lg'}>
        <WhatNextStep variant="returning" onComplete={props.onComplete} />

        {/* Start over deliberately leaves status alone: bailing halfway
            on a repeat run must not put the banner back on /home. */}
        <LinkAnchor
          href="/onboarding?step=1"
          fz={'sm'}
          onClick={props.onStartOver}
        >
          Start setup over
        </LinkAnchor>
      </Stack>
    </OnboardingScreen>
  );
}
