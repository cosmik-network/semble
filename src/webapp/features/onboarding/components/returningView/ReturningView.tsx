'use client';

import { Stack, Text } from '@mantine/core';
import { TbRefresh } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';
import OnboardingHeader from '../onboardingHeader/OnboardingHeader';
import OnboardingScreen from '../onboardingScreen/OnboardingScreen';
import WhatNextStep from '../steps/whatNextStep/WhatNextStep';

interface Props {
  onStartOver: () => void;
  onComplete: () => void;
}

export default function ReturningView(props: Props) {
  return (
    <OnboardingScreen header={<OnboardingHeader />}>
      <Stack gap={'xl'}>
        <WhatNextStep title="What next?" onComplete={props.onComplete} />

        <Stack align="center" gap={'xs'}>
          <Text fz={'sm'} fw={600} c={'gray'}>
            Want another look at the basics?
          </Text>

          <LinkButton
            href="/onboarding?step=1"
            onClick={props.onStartOver}
            variant="light"
            color="gray"
            radius={'xl'}
            size="sm"
            leftSection={<TbRefresh size={14} />}
          >
            Start over
          </LinkButton>
        </Stack>
      </Stack>
    </OnboardingScreen>
  );
}
