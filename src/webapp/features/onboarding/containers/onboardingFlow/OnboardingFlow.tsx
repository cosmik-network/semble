'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelection } from '@mantine/hooks';
import { STEPS, clampStep, type StepId } from '../../lib/steps';
import useOnboardingState from '../../lib/useOnboardingState';
import { decodeAnswer, encodeAnswer } from '../../lib/otherAnswer';
import OnboardingHeader from '../../components/onboardingHeader/OnboardingHeader';
import OnboardingFooter from '../../components/onboardingFooter/OnboardingFooter';
import OnboardingScreen from '../../components/onboardingScreen/OnboardingScreen';
import ReturningView from '../../components/returningView/ReturningView';
import WelcomeView from '../../components/welcomeView/WelcomeView';
import AboutYouStep from '../../components/steps/aboutYouStep/AboutYouStep';
import TopicsStep from '../../components/steps/topicsStep/TopicsStep';
import PickCardsStep from '../../components/steps/pickCardsStep/PickCardsStep';
import FollowStep from '../../components/steps/followStep/FollowStep';
import WhatNextStep from '../../components/steps/whatNextStep/WhatNextStep';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import useRecommendedUsers from '../../lib/queries/useRecommendedUsers';
import useRecommendedCollections from '../../lib/queries/useRecommendedCollections';
import {
  VISIBLE_COLLECTIONS,
  VISIBLE_USERS,
} from '../../components/steps/followStep/FollowStep';
import { FALLBACK_TOPICS } from '../../lib/topics';

interface StageFooter {
  onSkip?: () => void;
  onContinue?: () => void;
  continueHref?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, status, isLoaded, update, updateNow } = useOnboardingState();

  const [isNavigating, startTransition] = useTransition();

  const stepParam = searchParams.get('step');

  const isReturning =
    stepParam === null && (status === 'COMPLETED' || status === 'SKIPPED');

  const isWelcome = stepParam === null && !isReturning;

  const topics = state.topicsSelected ?? [];
  const seedUrls = state.linksSelected ?? [];

  const intention = decodeAnswer(state.intention);
  const referral = decodeAnswer(state.referralSource);

  const currentStep = clampStep(stepParam);

  const stepId = STEPS[currentStep - 1].id;

  // Skipping the topics stage stores `[]`, so the fallback is applied here
  // rather than persisted as a selection — the same rule useCardCandidates uses.
  const cardQueries = topics.length > 0 ? topics : FALLBACK_TOPICS;

  // The query key spreads the topics, so without the stage gate every toggle
  // on the topics stage fires a request the next toggle discards. isLoaded
  // keeps an unseeded cache from firing a throwaway fallback request.
  const recommendations = useRecommendedCards({
    queries: cardQueries,
    limit: 6,
    enabled: stepId === 'cards' && isLoaded,
  });

  const recommendedUrls =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  const suggestedUrls = recommendedUrls.map((view) => view.url);

  const fallbackUrls = suggestedUrls.slice(0, 5);

  const [selectedUrls, selection] = useSelection({
    data: suggestedUrls,
  });

  const suggestedUsers = useRecommendedUsers({
    urls: seedUrls,
    enabled: stepId === 'follow',
  });

  const suggestedCollections = useRecommendedCollections({
    urls: seedUrls,
    enabled: stepId === 'follow',
  });

  const complete = () => updateNow({ onboardingState: 'COMPLETED' });

  // Split out of goToStep for the anchors that navigate themselves but still
  // owe the same write.
  const markStep = () => {
    if (status === 'NOT_STARTED') {
      updateNow({ onboardingState: 'IN_PROGRESS' });
    }
  };

  const goToStep = (step: number) => {
    markStep();
    startTransition(() => router.push(`/onboarding?step=${step}`));
  };

  const goNext = () => goToStep(currentStep + 1);

  // Each stage commits its own field on the way out, empty array included: the
  // resume point is derived from which fields are non-null.
  const leaveAboutYou = () => {
    updateNow({
      intention: encodeAnswer(intention.selected, intention.otherText),
      referralSource: encodeAnswer(referral.selected, referral.otherText),
    });
    goNext();
  };

  const leaveTopics = (next: string[]) => {
    updateNow({ topicsSelected: next });
    goNext();
  };

  const leavePickCards = (next: string[]) => {
    updateNow({ linksSelected: next, linksSuggested: suggestedUrls });
    goNext();
  };

  const leaveFollow = () => {
    updateNow({
      suggestedAccounts: (suggestedUsers.data?.users ?? [])
        .slice(0, VISIBLE_USERS)
        .map((user) => user.id),
      suggestedCollections: (suggestedCollections.data?.collections ?? [])
        .slice(0, VISIBLE_COLLECTIONS)
        .map((collection) => collection.id),
      followedAccounts: state.followedAccounts ?? [],
      followedCollections: state.followedCollections ?? [],
    });
    goNext();
  };

  const recordFollow = (
    targetType: 'USER' | 'COLLECTION',
    targetId: string,
    isFollowing: boolean,
  ) => {
    const key =
      targetType === 'USER' ? 'followedAccounts' : 'followedCollections';

    update((current) => {
      const following = (current[key] ?? []).filter((id) => id !== targetId);

      return { [key]: isFollowing ? [...following, targetId] : following };
    });
  };

  const stageFooters: Record<StepId, StageFooter> = {
    about: {
      onSkip: leaveAboutYou,
      onContinue: leaveAboutYou,
      continueDisabled:
        intention.selected.length === 0 || referral.selected.length === 0,
    },
    topics: {
      onSkip: () => leaveTopics([]),
      onContinue: () => leaveTopics(topics),
      continueDisabled: topics.length === 0,
    },
    cards: {
      onSkip: () => leavePickCards(fallbackUrls),
      onContinue: () =>
        leavePickCards(selectedUrls.length > 0 ? selectedUrls : fallbackUrls),
      // !isLoaded covers the frame before the record arrives, where a fast
      // click would skip ahead writing an empty pick.
      continueDisabled: !isLoaded || recommendations.isLoading,
    },
    follow: {
      onSkip: leaveFollow,
      onContinue: leaveFollow,
    },
    next: {
      continueHref: '/home',
      continueLabel: 'Finish',
      onContinue: complete,
    },
  };

  if (isReturning) {
    return (
      <ReturningView
        onStartOver={() =>
          // Inputs only. The outcomes and the status survive: bailing on a
          // repeat run must not put the banner back on /home.
          updateNow({
            intention: null,
            referralSource: null,
            topicsSelected: null,
            linksSelected: null,
            linksSuggested: null,
            suggestedAccounts: null,
            suggestedCollections: null,
            followedAccounts: null,
            followedCollections: null,
          })
        }
        onComplete={complete}
      />
    );
  }

  if (isWelcome) {
    return <WelcomeView onStart={markStep} />;
  }

  return (
    <OnboardingScreen
      header={
        <OnboardingHeader stepper={{ currentStep, onSelectStep: goToStep }} />
      }
      footer={
        <OnboardingFooter
          backHref={
            currentStep > 1
              ? `/onboarding?step=${currentStep - 1}`
              : '/onboarding'
          }
          onBack={currentStep > 1 ? markStep : undefined}
          navigating={isNavigating}
          {...stageFooters[stepId]}
        />
      }
    >
      {/* These two write through useOnboardingState themselves — the same cache
          entry this container reads, so their answers reach the leave handlers
          above without being threaded back up. */}
      {stepId === 'about' && <AboutYouStep />}
      {stepId === 'topics' && <TopicsStep />}
      {stepId === 'cards' && (
        <PickCardsStep
          recommendations={recommendations}
          selectedUrls={selectedUrls}
          onToggleUrl={selection.toggle}
          progressLoaded={isLoaded}
        />
      )}
      {stepId === 'follow' && (
        <FollowStep
          users={suggestedUsers}
          collections={suggestedCollections}
          hasUrls={seedUrls.length > 0}
          progressLoaded={isLoaded}
          pickCardsHref={`/onboarding?step=${currentStep - 1}`}
          onPickMoreCards={markStep}
          onFollowChange={recordFollow}
        />
      )}
      {stepId === 'next' && (
        <WhatNextStep title="You're all set" onComplete={complete} />
      )}
    </OnboardingScreen>
  );
}
