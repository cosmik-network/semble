'use client';

import { Group, Progress, UnstyledButton } from '@mantine/core';
import { STEPS, TOTAL_STEPS } from '../../lib/steps';
import styles from './Stepper.module.css';

const REST_COLOR =
  'light-dark(var(--mantine-color-white), var(--mantine-color-dark-3))';

interface Props {
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export default function Stepper(props: Props) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      role="group"
      aria-label="Onboarding steps"
      style={{ flex: '0 0 auto' }}
    >
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = stepNumber === props.currentStep;

        return (
          <UnstyledButton
            key={step.id}
            className={styles.target}
            onClick={() => props.onSelectStep(stepNumber)}
            aria-label={`Step ${stepNumber} of ${TOTAL_STEPS}: ${step.label}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
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
                color={isCurrent ? 'tangerine' : REST_COLOR}
              />
            </Progress.Root>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
