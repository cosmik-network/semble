'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelection } from '@mantine/hooks';
import { STEPS, TOTAL_STEPS, clampStep } from '../../lib/steps';
import {
  type OnboardingStatus,
  writeOnboardingStatus,
} from '../../lib/onboardingStatus';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import OnboardingHeader from '../../components/onboardingHeader/OnboardingHeader';
import OnboardingFooter from '../../components/onboardingFooter/OnboardingFooter';
import OnboardingScreen from '../../components/onboardingScreen/OnboardingScreen';
import ReturningView from '../../components/returningView/ReturningView';
import WelcomeView from '../../components/welcomeView/WelcomeView';
import TopicsStep from '../../components/steps/topicsStep/TopicsStep';
import PickCardsStep from '../../components/steps/pickCardsStep/PickCardsStep';
import FollowStep from '../../components/steps/followStep/FollowStep';
import WhatNextStep from '../../components/steps/whatNextStep/WhatNextStep';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import { FALLBACK_TOPICS } from '../../lib/topics';

interface Props {
  initialStatus: OnboardingStatus;
}

/**
 * One footer config per stage, computed once and handed to OnboardingFooter
 * as a single object. Stages 3 and 4 add a branch here, not to four separate
 * ternary chains kept in sync by hand.
 */
interface FooterStageProps {
  onSkip?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFlow(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { progress, isLoaded, update, clear } = useOnboardingProgress();
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);

  // The presence of ?step= means "in the flow". That is what keeps the
  // returning view stable across a refresh mid-restart, and what separates
  // both non-flow screens below from the stages.
  const stepParam = searchParams.get('step');

  const isReturning =
    stepParam === null && (status === 'completed' || status === 'dismissed');

  // Bare /onboarding for anyone who has not finished: the welcome screen, not
  // stage 1. Entering the flow should be a decision, not something that has
  // already happened by the time the page paints.
  //
  // Only the bare URL. The home banner and "Start setup over" both link to an
  // explicit ?step=, so resuming never detours through here.
  const isWelcome = stepParam === null && !isReturning;

  // Lives here, not in the stage: the Continue handler below needs the top-5
  // fallback, and pushing it up from the child would require an Effect.
  //
  // The hook is already `enabled: queries.length > 0`, so during the first
  // frame — before the stored topics arrive — it simply does not fire. It
  // starts on its own once topics land. Nothing to coordinate. `enabled` also
  // excludes the welcome and returning screens, which render nothing this feeds.
  //
  // 5 to a page, because stage 2 shows 5 at a time and "Show different cards"
  // is just the next page. Results are randomised server-side, so each page is
  // a fresh set rather than a continuation of a ranked list.
  const recommendations = useRecommendedCards({
    queries: progress.topics,
    limit: 5,
    enabled: !isReturning && !isWelcome,
  });

  const recommendedUrls =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  const fallbackUrls = recommendedUrls.slice(0, 5).map((view) => view.url);

  // resetSelectionOnDataChange is deliberately omitted — it defaults to off,
  // and turning it on would wipe the user's picks every time "Show more"
  // grows `data`. The selection lives here rather than in the stage so it
  // survives a trip to stage 3 and back.
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

  // Everything goToStep does except the navigation. The footer's Back is a
  // real anchor that navigates itself, but it still owes the same status and
  // stepId writes Continue performs — otherwise the home banner would resume
  // somewhere the user has since left.
  const markStep = (step: number) => {
    // Moving between stages is what makes this "in progress" — an event, not
    // a mount.
    if (status === 'unseen') {
      changeStatus('in_progress');
    }
    update({ stepId: STEPS[step - 1].id });
  };

  const goToStep = (step: number) => {
    markStep(step);
    router.push(`/onboarding?step=${step}`);
  };

  // Stage 2 picks are a signal, not a save. They become the seed URLs stage 3
  // recommends people and collections from, and nothing is written to the
  // user's library — so this is synchronous, has nothing to fail, and needs no
  // loading state or partial-failure handling.
  //
  // Falling back to the top 5 when nothing is picked keeps stage 3 with
  // something to work from, exactly as skipping the stage does.
  const handlePickCardsContinue = () => {
    update({
      seedUrls: selectedUrls.length > 0 ? selectedUrls : fallbackUrls,
    });
    goToStep(3);
  };

  // isLoading (isPending && isFetching, per TanStack Query v5) is true only
  // while the first page is actively in flight. It's false before topics
  // arrive (the query is disabled, not fetching) and false once the query
  // settles either way — so gating on it blocks a premature Continue without
  // ever trapping anyone: an error still frees the button, same as an empty
  // topic list never blocks it in the first place.
  const footerProps: FooterStageProps =
    currentStep === 1
      ? {
          onSkip: () => {
            update({ topics: FALLBACK_TOPICS });
            goToStep(2);
          },
          onContinue: () => goToStep(2),
          continueDisabled: progress.topics.length === 0,
        }
      : currentStep === 2
        ? {
            onSkip: () => {
              update({ seedUrls: fallbackUrls });
              goToStep(3);
            },
            onContinue: handlePickCardsContinue,
            // !isLoaded covers the frame before stored topics arrive: the
            // query has not started, so isLoading is still false, and a fast
            // click would skip ahead writing seedUrls: [].
            continueDisabled: !isLoaded || recommendations.isLoading,
          }
        : currentStep < TOTAL_STEPS
          ? { onContinue: () => goToStep(currentStep + 1) }
          : {};

  if (isReturning) {
    return (
      <ReturningView
        onStartOver={clear}
        onComplete={() => changeStatus('completed')}
      />
    );
  }

  if (isWelcome) {
    // markStep(1) rather than a bare status write: "Get started" is a real
    // anchor to ?step=1, so it only has to record the move, not perform it.
    return <WelcomeView onStart={() => markStep(1)} />;
  }

  return (
    <OnboardingScreen
      header={
        <OnboardingHeader
          // goToStep, not markStep: Mantine's Stepper renders buttons rather
          // than links, so the click has to do the navigating itself.
          stepper={{ currentStep, onSelectStep: goToStep }}
          exitLabel="Finish later"
          onExit={() => {
            // Once earned, `completed` is permanent. A completed user reaches
            // this by "Start setup over" → walk to stage 2 → Finish later, or
            // by pressing browser Back after finishing at stage 4. Both
            // statuses hide the banner today, but onboardingStatus.ts is the
            // swap point for server-persisted completion and `completed` is
            // the field product and analytics will read once that lands.
            if (status !== 'completed') {
              changeStatus('dismissed');
            }
          }}
        />
      }
      footer={
        <OnboardingFooter
          backHref={
            currentStep > 1 ? `/onboarding?step=${currentStep - 1}` : undefined
          }
          onBack={() => markStep(currentStep - 1)}
          onSkip={footerProps.onSkip}
          onContinue={footerProps.onContinue}
          continueLabel={footerProps.continueLabel}
          continueDisabled={footerProps.continueDisabled}
        />
      }
    >
      {currentStep === 1 && (
        <TopicsStep
          topics={progress.topics}
          onChangeTopics={(topics) => update({ topics })}
          progressLoaded={isLoaded}
        />
      )}
      {currentStep === 2 && (
        <PickCardsStep
          recommendations={recommendations}
          selectedUrls={selectedUrls}
          onToggleUrl={selection.toggle}
          hasTopics={progress.topics.length > 0}
          progressLoaded={isLoaded}
        />
      )}
      {currentStep === 3 && (
        <FollowStep urls={progress.seedUrls} progressLoaded={isLoaded} />
      )}
      {currentStep === 4 && (
        <WhatNextStep
          variant="flow"
          onComplete={() => changeStatus('completed')}
        />
      )}
    </OnboardingScreen>
  );
}
