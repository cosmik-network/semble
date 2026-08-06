'use client';

import { useState } from 'react';
import { ActionIcon, Card, Group, Stack, Text } from '@mantine/core';
import { IoMdClose } from 'react-icons/io';
import { LinkButton } from '@/components/link/MantineLink';
import {
  type OnboardingStatus,
  writeOnboardingStatus,
} from '../../lib/onboardingStatus';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import { STEPS } from '../../lib/steps';

interface Props {
  initialStatus: OnboardingStatus;
}

export default function HomeOnboardingBannerCard(props: Props) {
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);
  const { progress } = useOnboardingProgress();

  if (status !== 'unseen' && status !== 'in_progress') {
    return null;
  }

  const isResuming = status === 'in_progress';

  // Deep-link straight to the stored stage. useLocalStorage returns the
  // hoisted EMPTY default until it has read storage, so on the first render
  // stepId is 'topics' → storedStep 1 → plain /onboarding. The href only ever
  // improves after that, and never needs a null check.
  //
  // Gated on isResuming because the two stores can disagree: if the status
  // cookie is absent but localStorage progress survived (cookie blocked,
  // expired, or selectively cleared) this banner says "Set up your account"
  // and would otherwise drop the user on stage 3.
  const storedStep = isResuming
    ? STEPS.findIndex((step) => step.id === progress.stepId) + 1
    : 1;
  const href =
    storedStep > 1 ? `/onboarding?step=${storedStep}` : '/onboarding';

  const dismiss = () => {
    writeOnboardingStatus('dismissed');
    setStatus('dismissed');
  };

  return (
    <Card withBorder radius={'lg'} p={'md'}>
      <Group justify="space-between" wrap="nowrap" gap={'md'}>
        <Stack gap={2} miw={0}>
          <Text fw={700} c={'bright'}>
            {isResuming ? 'Resume setup' : 'Set up your account'}
          </Text>
          <Text fz={'sm'} c={'dimmed'}>
            Pick your topics and find people and collections worth following.
          </Text>
        </Stack>

        <Group gap={'xs'} wrap="nowrap">
          <LinkButton href={href} color="dark">
            {isResuming ? 'Continue' : 'Get started'}
          </LinkButton>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Dismiss setup banner"
            onClick={dismiss}
          >
            <IoMdClose size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}
