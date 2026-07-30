'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Group, Progress, Stack, Text } from '@mantine/core';
import TopicsPane from '../../components/topicsPane/TopicsPane';
import CardsPane from '../../components/cardsPane/CardsPane';
import FollowPane from '../../components/followPane/FollowPane';

// Used when the user skips topic selection so later steps still have input
const FALLBACK_TOPICS = [
  'science',
  'AI',
  'personal knowledge management',
  'curation',
  'social networks',
];

const TOTAL_STEPS = 3;

export default function OnboardingContainer() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  // Frozen when leaving step 1 so edits mid-flow don't refire queries
  const [submittedTopics, setSubmittedTopics] = useState<string[]>([]);
  // URLs carried from step 2 (selected cards, or top recommendations)
  const [followUrls, setFollowUrls] = useState<string[]>([]);

  const handleComplete = () => {
    router.push('/explore');
  };

  return (
    <Container p={'xs'} size={'sm'}>
      <Stack gap={'xl'} py={'xl'}>
        <Group gap={'xs'} align="center">
          <Progress
            flex={1}
            maw={300}
            value={(step / TOTAL_STEPS) * 100}
            color="tangerine"
            radius={'xl'}
          />
          <Text fz={'sm'} fw={600} c={'gray'}>
            {step} of {TOTAL_STEPS}
          </Text>
        </Group>

        {step === 1 && (
          <TopicsPane
            selectedTopics={selectedTopics}
            onChangeTopics={setSelectedTopics}
            onContinue={() => {
              setSubmittedTopics(selectedTopics);
              setStep(2);
            }}
            onSkip={() => {
              setSubmittedTopics(FALLBACK_TOPICS);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <CardsPane
            topics={submittedTopics}
            onBack={() => setStep(1)}
            onContinue={(urls) => {
              setFollowUrls(urls);
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <FollowPane
            urls={followUrls}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
          />
        )}
      </Stack>
    </Container>
  );
}
