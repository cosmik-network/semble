'use client';

import { Box, Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import type useRecommendedCards from '../../../lib/queries/useRecommendedCards';
import { dedupeByUrl } from '../../../lib/dedupeByUrl';
import GoalProgress from '../../goalProgress/GoalProgress';
import OnboardingUrlCard from '../../onboardingUrlCard/OnboardingUrlCard';
import OnboardingUrlCardSkeleton from '../../onboardingUrlCard/Skeleton.OnboardingUrlCard';
import StepHeading from '../../stepHeading/StepHeading';

const PICK_GOAL = 2;

// One full first page, so the grid does not reflow when the cards land.
const PLACEHOLDER_CARDS = 6;

interface Props {
  recommendations: ReturnType<typeof useRecommendedCards>;
  selectedUrls: string[];
  onToggleUrl: (url: string) => void;
  hasTopics: boolean;
  progressLoaded: boolean;
}

export default function PickCardsStep(props: Props) {
  const {
    data,
    isPending: queryIsPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = props.recommendations;

  // The query is `enabled: queries.length > 0`, so with no stored topics it
  // sits at isPending forever — hence the hasTopics gate. !progressLoaded
  // covers the frame before stored topics arrive, where hasTopics is false for
  // the same reason it is on a genuinely empty record.
  const isPending =
    !props.progressLoaded || (props.hasTopics && queryIsPending);

  const urls = dedupeByUrl((data?.pages ?? []).flatMap((page) => page.urls));

  return (
    <Stack gap={'md'}>
      <StepHeading
        title="See anything interesting?"
        description="Select any of the links that seem interesting and relevant to you. We use these to suggest accounts to follow and to help you learn about Semble’s features."
      />

      {/* Fixed height so the grid does not jump when the label arrives. */}
      <Box h={26}>
        {!isPending && !isError && urls.length > 0 && (
          <GoalProgress picked={props.selectedUrls.length} goal={PICK_GOAL} />
        )}
      </Box>

      {isError && (
        <Text c={'dimmed'}>Unable to load suggestions. Skip to carry on.</Text>
      )}

      {!isPending && !isError && urls.length === 0 && (
        <Text c={'dimmed'}>
          No suggestions for those topics yet. Go back to add more topics, or
          skip.
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
        {isPending
          ? Array.from({ length: PLACEHOLDER_CARDS }).map((_, index) => (
              <OnboardingUrlCardSkeleton key={index} />
            ))
          : urls.map((urlView) => (
              <OnboardingUrlCard
                key={urlView.url}
                urlView={urlView}
                selected={props.selectedUrls.includes(urlView.url)}
                onToggle={props.onToggleUrl}
              />
            ))}
      </SimpleGrid>

      {hasNextPage && urls.length > 0 && (
        <Group justify="center">
          <Button
            variant="default"
            radius={'xl'}
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
          >
            Show more
          </Button>
        </Group>
      )}
    </Stack>
  );
}
