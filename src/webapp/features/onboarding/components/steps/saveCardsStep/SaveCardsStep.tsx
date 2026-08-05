'use client';

import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import type useRecommendedCards from '../../../lib/queries/useRecommendedCards';
import OnboardingUrlCard from '../../onboardingUrlCard/OnboardingUrlCard';

interface Props {
  recommendations: ReturnType<typeof useRecommendedCards>;
  selectedUrls: string[];
  onToggleUrl: (url: string) => void;
}

export default function SaveCardsStep(props: Props) {
  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = props.recommendations;

  const urls = data?.pages.flatMap((page) => page.urls) ?? [];

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>Save your first cards</Title>
        <Text c={'dimmed'}>
          Cards from your topics. Save any that look useful.
        </Text>
      </Stack>

      {isPending && (
        <Center py={'xl'}>
          <Stack align="center" gap={'xs'}>
            <Loader />
            <Text c={'dimmed'}>Finding cards for your topics…</Text>
          </Stack>
        </Center>
      )}

      {isError && (
        <Text c={'dimmed'}>
          Unable to load suggestions. Skip this step and save cards later.
        </Text>
      )}

      {!isPending && !isError && urls.length === 0 && (
        <Text c={'dimmed'}>
          No suggestions for those topics yet. Go back to add more topics, or
          skip this step.
        </Text>
      )}

      <Stack gap={'xs'} maw={640} w={'100%'}>
        {urls.map((urlView) => (
          <OnboardingUrlCard
            key={urlView.url}
            urlView={urlView}
            selected={props.selectedUrls.includes(urlView.url)}
            onToggle={props.onToggleUrl}
          />
        ))}

        {hasNextPage && (
          <Button
            variant="subtle"
            color="gray"
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
          >
            Show more
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
