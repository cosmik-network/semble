'use client';

import { Stack } from '@mantine/core';
import { decodeAnswer, encodeAnswer } from '../../../lib/otherAnswer';
import { INTENTION_QUESTION, REFERRAL_QUESTION } from '../../../lib/questions';
import useOnboardingState from '../../../lib/useOnboardingState';
import QuestionGroup from '../../questionGroup/QuestionGroup';
import StepHeading from '../../stepHeading/StepHeading';

export default function AboutYouStep() {
  const { state, stage } = useOnboardingState();

  const intention = decodeAnswer(state.intention);
  const referral = decodeAnswer(state.referralSource);

  return (
    <Stack gap={'xl'} w={'100%'}>
      <StepHeading
        title="Tell us why you’re here."
        description="Your answers shape what we build next."
      />

      <QuestionGroup
        question={INTENTION_QUESTION}
        selected={intention.selected}
        otherText={intention.otherText}
        onChange={(next) =>
          stage({ intention: encodeAnswer(next.selected, next.otherText) })
        }
      />

      <QuestionGroup
        question={REFERRAL_QUESTION}
        selected={referral.selected}
        otherText={referral.otherText}
        onChange={(next) =>
          stage({ referralSource: encodeAnswer(next.selected, next.otherText) })
        }
      />
    </Stack>
  );
}
