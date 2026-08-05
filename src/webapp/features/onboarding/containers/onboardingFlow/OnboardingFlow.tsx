'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Stack, Text } from '@mantine/core';
import { STEPS, TOTAL_STEPS, clampStep } from '../../lib/steps';
import {
  type OnboardingStatus,
  writeOnboardingStatus,
} from '../../lib/onboardingStatus';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import OnboardingHeader from '../../components/onboardingHeader/OnboardingHeader';
import OnboardingFooter from '../../components/onboardingFooter/OnboardingFooter';

interface Props {
  initialStatus: OnboardingStatus;
}

export default function OnboardingFlow(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useOnboardingProgress();
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);

  // Pure range check — no dependency on stored topics, so the stage that
  // renders is correct on the very first frame.
  const currentStep = clampStep(searchParams.get('step'));

  const changeStatus = (next: OnboardingStatus) => {
    writeOnboardingStatus(next);
    setStatus(next);
  };

  const goToStep = (step: number) => {
    // Advancing is what makes this "in progress" — an event, not a mount.
    if (status === 'unseen') {
      changeStatus('in_progress');
    }
    update({ stepId: STEPS[step - 1].id });
    router.push(`/onboarding?step=${step}`);
  };

  return (
    <Stack h={'100svh'} gap={0}>
      <OnboardingHeader
        currentStep={currentStep}
        showStepper
        exitLabel="Exit setup"
        onExit={() => changeStatus('dismissed')}
      />

      <Container
        size={'md'}
        flex={1}
        w={'100%'}
        py={'xl'}
        px={'md'}
        style={{ overflowY: 'auto' }}
      >
        <Text c={'dimmed'}>
          Stage {currentStep} of {TOTAL_STEPS}: {STEPS[currentStep - 1].label}
        </Text>
      </Container>

      <OnboardingFooter
        backHref={
          currentStep > 1 ? `/onboarding?step=${currentStep - 1}` : undefined
        }
        onContinue={
          currentStep < TOTAL_STEPS ? () => goToStep(currentStep + 1) : undefined
        }
      />
    </Stack>
  );
}
