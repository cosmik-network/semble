'use client';

import { Stack } from '@mantine/core';
import { INTENTION_QUESTION, REFERRAL_QUESTION } from '../../../lib/questions';
import QuestionGroup from '../../questionGroup/QuestionGroup';
import StepHeading from '../../stepHeading/StepHeading';

interface Props {
  intention: string[];
  intentionOther: string;
  referralSource: string[];
  referralSourceOther: string;
  onChangeIntention: (next: { selected: string[]; otherText: string }) => void;
  onChangeReferral: (next: { selected: string[]; otherText: string }) => void;
}

/**
 * Two research questions, asked before the flow starts personalizing anything.
 *
 * Nothing downstream reads the answers, which is why the footer never disables
 * Continue here.
 */
export default function AboutYouStep(props: Props) {
  return (
    // No measure of its own: OnboardingScreen's Container sets one width for
    // every stage, and a stage that clamps itself inside that starts its
    // heading at a different x to the rest of the flow.
    <Stack gap={'xl'} w={'100%'}>
      <StepHeading
        title="Two quick questions"
        description="Your answers shape what we build next."
      />

      <QuestionGroup
        question={INTENTION_QUESTION}
        selected={props.intention}
        otherText={props.intentionOther}
        onChange={props.onChangeIntention}
      />

      <QuestionGroup
        question={REFERRAL_QUESTION}
        selected={props.referralSource}
        otherText={props.referralSourceOther}
        onChange={props.onChangeReferral}
      />
    </Stack>
  );
}
