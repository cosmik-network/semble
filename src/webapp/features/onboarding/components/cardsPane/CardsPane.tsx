'use client';

import { useState } from 'react';
import {
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import OnboardingUrlCard from '../onboardingUrlCard/OnboardingUrlCard';
import { CardSaveSource } from '@/features/analytics/types';

// How many recommended cards to show at once
const VISIBLE_CARDS = 10;
// How many top links to carry forward when the user selects none
const FALLBACK_URL_COUNT = 5;

interface Props {
  topics: string[];
  onBack: () => void;
  onContinue: (urls: string[]) => void;
}

export default function CardsPane(props: Props) {
  const { data, isPending, isError } = useRecommendedCards({
    queries: props.topics,
  });
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const addCard = useAddCard({
    saveSource: CardSaveSource.ONBOARDING,
    pagePath: '/onboarding',
  });

  const urls = data?.urls ?? [];
  const visibleUrls = urls.slice(0, VISIBLE_CARDS);

  const toggleUrl = (url: string) => {
    setSelectedUrls((current) =>
      current.includes(url)
        ? current.filter((u) => u !== url)
        : [...current, url],
    );
  };

  const fallbackUrls = urls
    .slice(0, FALLBACK_URL_COUNT)
    .map((urlView) => urlView.url);

  const handleContinue = async () => {
    if (selectedUrls.length === 0) {
      props.onContinue(fallbackUrls);
      return;
    }

    setIsSaving(true);
    try {
      await Promise.allSettled(
        selectedUrls.map((url) => addCard.mutateAsync({ url })),
      );
    } finally {
      setIsSaving(false);
    }
    props.onContinue(selectedUrls);
  };

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>Save your first cards</Title>
        <Text c={'gray'}>
          A few links to start your library, selected from the interests you
          chose.
        </Text>
      </Stack>

      {isPending && (
        <Center py={'xl'}>
          <Stack align="center" gap={'xs'}>
            <Loader />
            <Text c={'gray'}>Finding links for your interests...</Text>
          </Stack>
        </Center>
      )}

      {isError && (
        <Text c={'gray'}>
          Could not load recommendations right now. You can skip this step and
          keep going.
        </Text>
      )}

      {!isPending && !isError && visibleUrls.length === 0 && (
        <Text c={'gray'}>
          No recommendations found for those topics yet. You can skip this step
          and keep going.
        </Text>
      )}

      <Stack gap={'xs'} maw={600} w={'100%'} mx={'auto'}>
        {visibleUrls.map((urlView) => (
          <OnboardingUrlCard
            key={urlView.url}
            urlView={urlView}
            selected={selectedUrls.includes(urlView.url)}
            onToggle={toggleUrl}
          />
        ))}
      </Stack>

      <Group justify="space-between">
        <Button
          variant="subtle"
          color="gray"
          onClick={props.onBack}
          disabled={isSaving}
        >
          Back
        </Button>
        <Group gap={'xs'}>
          <Button
            variant="subtle"
            color="gray"
            onClick={() => props.onContinue(fallbackUrls)}
            disabled={isSaving}
          >
            Skip
          </Button>
          <Button
            color="dark"
            onClick={handleContinue}
            loading={isSaving}
            disabled={isPending}
          >
            {selectedUrls.length > 0
              ? `Save ${selectedUrls.length} card${selectedUrls.length === 1 ? '' : 's'} and continue`
              : 'Continue'}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
