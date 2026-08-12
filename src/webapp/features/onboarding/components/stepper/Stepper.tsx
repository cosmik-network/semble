'use client';

import { Group, Progress, UnstyledButton } from '@mantine/core';
import { STEPS, TOTAL_STEPS } from '../../lib/steps';
import styles from './Stepper.module.css';

/** The stages you have not reached. */
const REST_COLOR =
  'light-dark(var(--mantine-color-white), var(--mantine-color-dark-3))';

interface Props {
  /** 1-based. */
  currentStep: number;
  /** Records the stage **and** navigates — see the note below. */
  onSelectStep: (step: number) => void;
}

/**
 * Each mark is a Mantine `Progress` filled to 100% rather than a hand-rolled
 * div, so only the width belongs to this component. `withAria` is off — the
 * button around each mark carries the real label.
 *
 * Buttons, not links: a dot has no room for a label and an anchor would need
 * one, so `onSelectStep` navigates as well as records.
 */
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
            // The marks are 8px tall, far under a usable target, so the button
            // pads them out to a full row.
            aria-label={`Step ${stepNumber} of ${TOTAL_STEPS}: ${step.label}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <Progress.Root
              className={styles.bar}
              mod={{ current: isCurrent }}
              size={8}
              radius={'xl'}
              // The section is always 100%, so the stylesheet owns both moving
              // parts instead — see Stepper.module.css.
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
