'use client';

import { Box, Group, Image, Text } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { TOTAL_STEPS } from '../../lib/steps';
import Stepper from '../stepper/Stepper';

interface Props {
  /**
   * Omitted on the returning view. One object rather than a
   * currentStep/showStepper pair, so there is no way to ask for a stepper
   * without saying which stage.
   */
  stepper?: {
    /** 1-based. */
    currentStep: number;
    /** Records the stage before the browser follows a stepper pill. */
    onSelectStep: (step: number) => void;
  };
}

export default function OnboardingHeader(props: Props) {
  return (
    // No background and no border: the header is a flex sibling of the scroll
    // area rather than a layer over it, so nothing passes beneath it.
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
            {/* Tabular figures keep it from shifting as it counts up. */}
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
