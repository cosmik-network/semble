'use client';

import { Group, Text } from '@mantine/core';
import { LinkButton } from '@/components/link/MantineLink';
import Stepper from '../stepper/Stepper';

interface Props {
  /** 1-based. */
  currentStep: number;
  /** False on the returning view — there is no flow to show progress through. */
  showStepper: boolean;
  exitLabel: string;
  /** Writes the status before the browser follows the link. */
  onExit: () => void;
}

export default function OnboardingHeader(props: Props) {
  return (
    <Group
      component="header"
      px={'md'}
      py={'sm'}
      gap={'md'}
      wrap="nowrap"
      align="center"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Text fw={700} fz={'lg'} style={{ flex: '0 0 auto' }}>
        Semble
      </Text>

      {props.showStepper && <Stepper currentStep={props.currentStep} />}

      <LinkButton
        href="/home"
        variant="subtle"
        color="gray"
        size="compact-sm"
        ml={'auto'}
        onClick={props.onExit}
      >
        {props.exitLabel}
      </LinkButton>
    </Group>
  );
}
