'use client';

import { Box, Group, Progress, UnstyledButton } from '@mantine/core';
import { STEPS, TOTAL_STEPS } from '../../lib/steps';
import styles from './Stepper.module.css';

const REST_COLOR =
  'light-dark(var(--mantine-color-white), var(--mantine-color-dark-3))';

interface Props {
  currentStep: number;
  onSelectStep?: (step: number) => void;
  restColor?: string;
}

export default function Stepper(props: Props) {
  const onSelectStep = props.onSelectStep;
  const isInteractive = Boolean(onSelectStep);
  const restColor = props.restColor ?? REST_COLOR;

  return (
    <Group
      gap={6}
      wrap="nowrap"
      role={isInteractive ? 'group' : undefined}
      aria-label={isInteractive ? 'Onboarding steps' : undefined}
      aria-hidden={isInteractive ? undefined : true}
      style={{ flex: '0 0 auto' }}
    >
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = stepNumber === props.currentStep;

        const mark = (
          <Progress.Root
            className={styles.bar}
            mod={{ current: isCurrent }}
            size={8}
            radius={'xl'}
            transitionDuration={0}
          >
            <Progress.Section
              className={styles.fill}
              value={100}
              withAria={false}
              color={isCurrent ? 'tangerine' : restColor}
            />
          </Progress.Root>
        );

        if (!onSelectStep) {
          return (
            <Box key={step.id} py={8}>
              {mark}
            </Box>
          );
        }

        return (
          <UnstyledButton
            key={step.id}
            className={styles.target}
            onClick={() => onSelectStep(stepNumber)}
            aria-label={`Step ${stepNumber} of ${TOTAL_STEPS}: ${step.label}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {mark}
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
