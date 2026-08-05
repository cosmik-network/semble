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

export default function HomeOnboardingBanner(props: Props) {
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);
  const { progress } = useOnboardingProgress();

  if (status !== 'unseen' && status !== 'in_progress') {
    return null;
  }

  const isResuming = status === 'in_progress';

  // Deep-link straight to the stored stage. Before the client store is read,
  // progress is null and this is just /onboarding — which resolves to stage 1
  // anyway, so the href only ever improves after hydration.
  const storedStep = progress
    ? STEPS.findIndex((step) => step.id === progress.stepId) + 1
    : 0;
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
            Pick your topics, save a few cards, and find people to follow.
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
