'use client';

import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import type useRecommendedCards from '../../../lib/queries/useRecommendedCards';
import OnboardingUrlCard from '../../onboardingUrlCard/OnboardingUrlCard';

interface Props {
  recommendations: ReturnType<typeof useRecommendedCards>;
  selectedUrls: string[];
  onToggleUrl: (url: string) => void;
  hasTopics: boolean;
  /** False until stored progress has been read — see useOnboardingProgress. */
  progressLoaded: boolean;
}

export default function SaveCardsStep(props: Props) {
  const {
    data,
    isPending: queryIsPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = props.recommendations;

  // The query is `enabled: queries.length > 0`, so with no stored topics it
  // sits at isPending: true forever — no fetch ever starts. Gate on whether
  // topics exist, mirroring stage 3's hasUrls/isPending pattern, so a
  // deep-link with no topics falls through to the empty state below instead
  // of spinning forever.
  //
  // !progressLoaded covers the frame before stored topics arrive, where
  // hasTopics is still false for the same reason it is on a genuinely empty
  // record. Without it the empty branch flashes before the spinner.
  const isPending =
    !props.progressLoaded || (props.hasTopics && queryIsPending);

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
