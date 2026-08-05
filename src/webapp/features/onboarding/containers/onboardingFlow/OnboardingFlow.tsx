'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Stack, Text } from '@mantine/core';
import { useSelection } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { STEPS, TOTAL_STEPS, clampStep } from '../../lib/steps';
import {
  type OnboardingStatus,
  writeOnboardingStatus,
} from '../../lib/onboardingStatus';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import OnboardingHeader from '../../components/onboardingHeader/OnboardingHeader';
import OnboardingFooter from '../../components/onboardingFooter/OnboardingFooter';
import TopicsStep from '../../components/steps/topicsStep/TopicsStep';
import SaveCardsStep from '../../components/steps/saveCardsStep/SaveCardsStep';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import { FALLBACK_TOPICS } from '../../lib/topics';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import { CardSaveSource } from '@/features/analytics/types';

interface Props {
  initialStatus: OnboardingStatus;
}

export default function OnboardingFlow(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { progress, update } = useOnboardingProgress();
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = useAddCard({
    saveSource: CardSaveSource.ONBOARDING,
    pagePath: '/onboarding',
  });

  // Lives here, not in the stage: the Continue handler below needs the top-5
  // fallback, and pushing it up from the child would require an Effect.
  //
  // The hook is already `enabled: queries.length > 0`, so during the first
  // frame — before the stored topics arrive — it simply does not fire. It
  // starts on its own once topics land. Nothing to coordinate.
  const recommendations = useRecommendedCards({
    queries: progress.topics,
    limit: 10,
  });

  const recommendedUrls =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  const fallbackUrls = recommendedUrls.slice(0, 5).map((view) => view.url);

  // resetSelectionOnDataChange is deliberately omitted — it defaults to off,
  // and turning it on would wipe the user's picks every time "Show more"
  // grows `data`. Selections come back in click order, so the "Save N cards"
  // label and the save order match what they did.
  const [selectedUrls, selection] = useSelection({
    data: recommendedUrls.map((view) => view.url),
  });

  // Pure range check — no dependency on stored topics, so the stage that
  // renders is correct on the very first frame.
  const currentStep = clampStep(searchParams.get('step'));

  const changeStatus = (next: OnboardingStatus) => {
    writeOnboardingStatus(next);
    setStatus(next);
  };

  const goToStep = (step: number) => {
    // Advancing is what makes this "in progress" — an event, not a mount.
    if (status === 'unseen') {
      changeStatus('in_progress');
    }
    update({ stepId: STEPS[step - 1].id });
    router.push(`/onboarding?step=${step}`);
  };

  // The one place in the flow that must be a handler rather than a Link:
  // it saves before it navigates.
  const handleSaveCardsContinue = async () => {
    if (selectedUrls.length === 0) {
      update({ seedUrls: fallbackUrls });
      goToStep(3);
      return;
    }

    setIsSaving(true);
    const results = await Promise.allSettled(
      selectedUrls.map((url) => addCard.mutateAsync({ url })),
    );
    setIsSaving(false);

    const saved = selectedUrls.filter(
      (_url, index) => results[index].status === 'fulfilled',
    );

    if (saved.length < selectedUrls.length) {
      notifications.show({
        color: 'yellow',
        message:
          selectedUrls.length === 1
            ? 'Unable to save that card. Try again from your library.'
            : `Saved ${saved.length} of ${selectedUrls.length} cards. Try the rest again from your library.`,
      });
    }

    // Never trap anyone: advance even on partial failure.
    update({ savedUrls: saved, seedUrls: selectedUrls });
    goToStep(3);
  };

  return (
    <Stack h={'100svh'} gap={0}>
      <OnboardingHeader
        currentStep={currentStep}
        showStepper
        exitLabel="Exit setup"
        onExit={() => changeStatus('dismissed')}
      />

      <Container
        size={'md'}
        flex={1}
        w={'100%'}
        py={'xl'}
        px={'md'}
        style={{ overflowY: 'auto' }}
      >
        {currentStep === 1 && (
          <TopicsStep
            topics={progress.topics}
            onChangeTopics={(topics) => update({ topics })}
          />
        )}
        {currentStep === 2 && (
          <SaveCardsStep
            recommendations={recommendations}
            selectedUrls={selectedUrls}
            onToggleUrl={selection.toggle}
          />
        )}
        {currentStep !== 1 && currentStep !== 2 && (
          <Text c={'dimmed'}>
            Stage {currentStep} of {TOTAL_STEPS}: {STEPS[currentStep - 1].label}
          </Text>
        )}
      </Container>

      <OnboardingFooter
        backHref={
          currentStep > 1 ? `/onboarding?step=${currentStep - 1}` : undefined
        }
        onSkip={
          currentStep === 1
            ? () => {
                update({ topics: FALLBACK_TOPICS });
                goToStep(2);
              }
            : currentStep === 2
              ? () => {
                  update({ seedUrls: fallbackUrls });
                  goToStep(3);
                }
              : undefined
        }
        onContinue={
          currentStep === 2
            ? handleSaveCardsContinue
            : currentStep < TOTAL_STEPS
              ? () => goToStep(currentStep + 1)
              : undefined
        }
        continueLabel={
          currentStep === 2 && selectedUrls.length > 0
            ? selectedUrls.length === 1
              ? 'Save 1 card and continue'
              : `Save ${selectedUrls.length} cards and continue`
            : undefined
        }
        continueDisabled={currentStep === 1 && progress.topics.length === 0}
        continueLoading={isSaving}
      />
    </Stack>
  );
}
