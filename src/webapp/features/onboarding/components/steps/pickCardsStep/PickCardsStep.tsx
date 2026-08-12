'use client';

import {
  Button,
  Center,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import type useRecommendedCards from '../../../lib/queries/useRecommendedCards';
import OnboardingUrlCard from '../../onboardingUrlCard/OnboardingUrlCard';
import StepHeading from '../../stepHeading/StepHeading';

const PICK_GOAL = 2;

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
  // sits at isPending: true forever — hence the hasTopics gate, or a deep-link
  // with nothing stored would spin without end. !progressLoaded covers the
  // frame before stored topics arrive, where hasTopics is false for the same
  // reason it is on a genuinely empty record.
  const isPending =
    !props.progressLoaded || (props.hasTopics && queryIsPending);

  // Deduped because pages are randomised server-side and the same URL can come
  // back on two of them; two cards with one key is a React warning and a
  // doubled row.
  const seen = new Set<string>();

  const urls = (data?.pages ?? [])
    .flatMap((page) => page.urls)
    .filter((view) => {
      if (seen.has(view.url)) return false;
      seen.add(view.url);
      return true;
    });

  const pickedCount = props.selectedUrls.length;
  const goalReached = pickedCount >= PICK_GOAL;

  // A full string per branch rather than one assembled around the number:
  // word order and plural rules differ by language.
  const goalLabel =
    pickedCount === 0
      ? `Pick ${PICK_GOAL} for the best suggestions`
      : goalReached
        ? 'Good to go — pick more if you like'
        : `${pickedCount} of ${PICK_GOAL} picked`;

  return (
    <Stack gap={'md'}>
      <StepHeading
        title="What catches your eye?"
        description="Nothing is saved here. Your picks shape the people and collections we suggest next."
      />

      {!isPending && !isError && urls.length > 0 && (
        <Group gap={'sm'} wrap="nowrap">
          <Progress
            value={(Math.min(pickedCount, PICK_GOAL) / PICK_GOAL) * 100}
            w={72}
            size="sm"
            radius={'xl'}
            color="tangerine"
            transitionDuration={200}
            aria-hidden="true"
          />
          <Text
            fz={'sm'}
            fw={goalReached ? 600 : 500}
            c={goalReached ? 'bright' : 'dimmed'}
          >
            {goalLabel}
          </Text>
        </Group>
      )}

      {isPending && (
        <Center py={'xl'}>
          <Stack align="center" gap={'xs'}>
            <Loader />
            <Text c={'dimmed'}>Finding cards for your topics…</Text>
          </Stack>
        </Center>
      )}

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
        {urls.map((urlView) => (
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
