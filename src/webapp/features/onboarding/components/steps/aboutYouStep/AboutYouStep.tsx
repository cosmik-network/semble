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

export default function AboutYouStep(props: Props) {
  return (
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
