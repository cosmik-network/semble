'use client';

import { useState } from 'react';
import { ActionIcon, Card, Group, Stack, Text } from '@mantine/core';
import { IoMdClose } from 'react-icons/io';
import { LinkButton } from '@/components/link/MantineLink';
import useUpdateOnboardingState from '../../lib/mutations/useUpdateOnboardingState';
import type { ResumePoint } from '../../lib/resumePoint';
import { TOTAL_STEPS } from '../../lib/steps';
import OnboardingBackground from '../onboardingBackground/OnboardingBackground';
import Stepper from '../stepper/Stepper';

// The stepper's own default is white, which disappears on this card's surface.
const REST_MARK_COLOR =
  'light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))';

interface Props {
  isResuming: boolean;
  resume: ResumePoint;
}

export default function HomeOnboardingBannerCard(props: Props) {
  const [dismissed, setDismissed] = useState(false);
  const updateState = useUpdateOnboardingState();

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    updateState.mutate({ onboardingState: 'SKIPPED' });
  };

  return (
    <Card withBorder radius={'lg'} p={{ base: 'md', sm: 'lg' }} pos="relative">
      <OnboardingBackground variant="banner" />

      <Group
        justify="space-between"
        align="flex-end"
        wrap="wrap"
        gap={'md'}
        pos="relative"
      >
        <Stack gap={4} miw={0}>
          <Text fw={700} fz={'lg'} c={'bright'}>
            {props.isResuming ? 'Resume setup' : 'Set up your account'}
          </Text>

          <Text fz={'sm'} fw={600} c={'gray'}>
            {props.isResuming
              ? `Step ${props.resume.step} of ${TOTAL_STEPS} · ${props.resume.label}`
              : 'Five quick steps to get started'}
          </Text>

          <Stepper
            currentStep={props.resume.step}
            restColor={REST_MARK_COLOR}
          />
        </Stack>

        <LinkButton href={props.resume.href} w={{ base: '100%', sm: 'auto' }}>
          {props.isResuming ? 'Continue' : 'Get started'}
        </LinkButton>
      </Group>

      <ActionIcon
        variant="subtle"
        color="gray"
        radius={'xl'}
        aria-label="Dismiss setup banner"
        onClick={dismiss}
        pos="absolute"
        top={8}
        right={8}
      >
        <IoMdClose size={18} />
      </ActionIcon>
    </Card>
  );
}
