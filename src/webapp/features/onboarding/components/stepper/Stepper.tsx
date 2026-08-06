'use client';

import { Stepper as MantineStepper } from '@mantine/core';
import { STEPS } from '../../lib/steps';
import styles from './Stepper.module.css';

interface Props {
  /** 1-based. */
  currentStep: number;
  /** Records the stage **and** navigates — see the note below. */
  onSelectStep: (step: number) => void;
}

/**
 * Mantine's own `Stepper`, rather than the hand-rolled row of numbered anchors
 * this replaced. It gives the completed / current / upcoming states, the
 * connectors and the check marks on passed stages for free, and keeps this
 * file to a shape and a mapping.
 *
 * The cost is real and worth stating: `Stepper.Step` renders a button and is
 * not polymorphic, so these are no longer links. Middle-clicking a stage no
 * longer opens it in a tab and Next cannot prefetch it — which is why
 * `onSelectStep` now has to navigate as well as record, where the anchors only
 * had to record and let the browser do the rest.
 *
 * `allowNextStepsSelect` is left at its default of true: every stage stays
 * reachable, forward as well as back.
 */
export default function Stepper(props: Props) {
  return (
    <MantineStepper
      active={props.currentStep - 1}
      onStepClick={(index) => props.onSelectStep(index + 1)}
      size="sm"
      iconSize={28}
      color="tangerine"
      flex={1}
      miw={0}
      classNames={{ stepBody: styles.stepBody }}
    >
      {STEPS.map((step) => (
        <MantineStepper.Step key={step.id} label={step.label} />
      ))}
    </MantineStepper>
  );
}
