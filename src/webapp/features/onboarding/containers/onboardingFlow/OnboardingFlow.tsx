'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelection } from '@mantine/hooks';
import { STEPS, clampStep } from '../../lib/steps';
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
import AboutYouStep from '../../components/steps/aboutYouStep/AboutYouStep';
import TopicsStep from '../../components/steps/topicsStep/TopicsStep';
import PickCardsStep from '../../components/steps/pickCardsStep/PickCardsStep';
import FollowStep from '../../components/steps/followStep/FollowStep';
import WhatNextStep from '../../components/steps/whatNextStep/WhatNextStep';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import { FALLBACK_TOPICS } from '../../lib/topics';

interface Props {
  initialStatus: OnboardingStatus;
}

interface FooterStageProps {
  onSkip?: () => void;
  onContinue?: () => void;
  continueHref?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFlow(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { progress, isLoaded, update, clear } = useOnboardingProgress();
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);

  // The presence of ?step= means "in the flow", which is what separates both
  // non-flow screens below from the stages.
  const stepParam = searchParams.get('step');

  const isReturning =
    stepParam === null && (status === 'completed' || status === 'dismissed');

  const isWelcome = stepParam === null && !isReturning;

  // Here rather than in the stage: the Continue handler below needs the top-5
  // fallback, and pushing it up from the child would require an Effect.
  const recommendations = useRecommendedCards({
    queries: progress.topics,
    limit: 6,
    enabled: !isReturning && !isWelcome,
  });

  const recommendedUrls =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  const fallbackUrls = recommendedUrls.slice(0, 5).map((view) => view.url);

  // resetSelectionOnDataChange is deliberately omitted: turning it on would
  // wipe the user's picks every time "Show more" grows `data`.
  const [selectedUrls, selection] = useSelection({
    data: recommendedUrls.map((view) => view.url),
  });

  const currentStep = clampStep(searchParams.get('step'));

  // Everything below branches on the id rather than the number: parallel
  // ladders of `currentStep === 3` mismatch the day a stage is inserted.
  const stepId = STEPS[currentStep - 1].id;

  const changeStatus = (next: OnboardingStatus) => {
    writeOnboardingStatus(next);
    setStatus(next);
  };

  // Everything goToStep does except the navigation, for the footer's Back —
  // an anchor that navigates itself but still owes the same writes.
  const markStep = (step: number) => {
    if (status === 'unseen') {
      changeStatus('in_progress');
    }
    update({ stepId: STEPS[step - 1].id });
  };

  const goToStep = (step: number) => {
    markStep(step);
    router.push(`/onboarding?step=${step}`);
  };

  const goNext = () => goToStep(currentStep + 1);

  // The picks only seed the follow stage's recommendations — nothing reaches
  // the library, so there is nothing here to fail.
  const handlePickCardsContinue = () => {
    update({
      seedUrls: selectedUrls.length > 0 ? selectedUrls : fallbackUrls,
    });
    goNext();
  };

  const footerProps: FooterStageProps =
    stepId === 'about'
      ? {
          onSkip: goNext,
          onContinue: goNext,
        }
      : stepId === 'topics'
        ? {
            onSkip: () => {
              update({ topics: FALLBACK_TOPICS });
              goNext();
            },
            onContinue: goNext,
            continueDisabled: progress.topics.length === 0,
          }
        : stepId === 'cards'
          ? {
              onSkip: () => {
                update({ seedUrls: fallbackUrls });
                goNext();
              },
              onContinue: handlePickCardsContinue,
              // isLoading is true only while the first page is in flight, so
              // an error still frees the button. !isLoaded covers the frame
              // before stored topics arrive, where the query has not started
              // and a fast click would skip ahead writing seedUrls: [].
              continueDisabled: !isLoaded || recommendations.isLoading,
            }
          : stepId === 'follow'
            ? {
                // Nothing to apply on the way out: a follow is performed the
                // moment the button is pressed.
                onSkip: goNext,
                onContinue: goNext,
              }
            : {
                // The last stage: the forward control leaves the flow.
                continueHref: '/home',
                continueLabel: 'Finish',
                onContinue: () => changeStatus('completed'),
              };

  if (isReturning) {
    return (
      <ReturningView
        onStartOver={clear}
        onComplete={() => changeStatus('completed')}
      />
    );
  }

  if (isWelcome) {
    // "Get started" is an anchor to ?step=1, so this only records the move.
    return <WelcomeView onStart={() => markStep(1)} />;
  }

  return (
    <OnboardingScreen
      header={
        <OnboardingHeader
          // goToStep, not markStep: the stepper renders buttons rather than
          // links, so the click has to do the navigating itself.
          stepper={{ currentStep, onSelectStep: goToStep }}
        />
      }
      footer={
        <OnboardingFooter
          // Stage 1's Back goes to the welcome screen.
          backHref={
            currentStep > 1
              ? `/onboarding?step=${currentStep - 1}`
              : '/onboarding'
          }
          // Nothing to record stepping back to the welcome screen: STEPS has
          // no entry before 'about'.
          onBack={currentStep > 1 ? () => markStep(currentStep - 1) : undefined}
          onSkip={footerProps.onSkip}
          onContinue={footerProps.onContinue}
          continueHref={footerProps.continueHref}
          continueLabel={footerProps.continueLabel}
          continueDisabled={footerProps.continueDisabled}
        />
      }
    >
      {stepId === 'about' && (
        <AboutYouStep
          intention={progress.intention}
          intentionOther={progress.intentionOther}
          referralSource={progress.referralSource}
          referralSourceOther={progress.referralSourceOther}
          // Straight into stored progress on every keystroke: useLocalStorage
          // reads in an effect, so local state seeded at mount would sit empty
          // after a refresh and there is no useEffect here to resync it.
          onChangeIntention={(next) =>
            update({ intention: next.selected, intentionOther: next.otherText })
          }
          onChangeReferral={(next) =>
            update({
              referralSource: next.selected,
              referralSourceOther: next.otherText,
            })
          }
        />
      )}
      {stepId === 'topics' && (
        <TopicsStep
          topics={progress.topics}
          onChangeTopics={(topics) => update({ topics })}
          progressLoaded={isLoaded}
        />
      )}
      {stepId === 'cards' && (
        <PickCardsStep
          recommendations={recommendations}
          selectedUrls={selectedUrls}
          onToggleUrl={selection.toggle}
          hasTopics={progress.topics.length > 0}
          progressLoaded={isLoaded}
        />
      )}
      {stepId === 'follow' && (
        <FollowStep
          urls={progress.seedUrls}
          progressLoaded={isLoaded}
          pickCardsHref={`/onboarding?step=${currentStep - 1}`}
          onPickMoreCards={() => markStep(currentStep - 1)}
        />
      )}
      {stepId === 'next' && (
        <WhatNextStep
          variant="flow"
          onComplete={() => changeStatus('completed')}
        />
      )}
    </OnboardingScreen>
  );
}
