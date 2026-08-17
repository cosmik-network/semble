'use client';

import { Box, Group, Image, Text } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { TOTAL_STEPS } from '../../lib/steps';
import Stepper from '../stepper/Stepper';

interface Props {
  stepper?: {
    currentStep: number;
    onSelectStep: (step: number) => void;
  };
}

export default function OnboardingHeader(props: Props) {
  return (
    <Box component="header">
      <Group
        p={'md'}
        gap={'md'}
        wrap="nowrap"
        align="center"
        justify="space-between"
      >
        <Group gap={'xs'} wrap="nowrap">
          <Image src={SembleLogo.src} alt="Semble logo" h={28} w={'auto'} />
          <Text fw={600}>Get started</Text>
        </Group>

        {props.stepper && (
          <Group gap={'sm'} wrap="nowrap" style={{ flex: '0 0 auto' }}>
            <Text
              fz={'sm'}
              fw={600}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              Step {props.stepper.currentStep} of {TOTAL_STEPS}
            </Text>

            <Stepper
              currentStep={props.stepper.currentStep}
              onSelectStep={props.stepper.onSelectStep}
            />
          </Group>
        )}
      </Group>
    </Box>
  );
}
