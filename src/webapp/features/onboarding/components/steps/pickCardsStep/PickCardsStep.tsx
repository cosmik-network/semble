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
  Title,
} from '@mantine/core';
import { TbRefresh } from 'react-icons/tb';
import type useRecommendedCards from '../../../lib/queries/useRecommendedCards';
import OnboardingUrlCard from '../../onboardingUrlCard/OnboardingUrlCard';

/** Matches the query's page size, so one page fills the row exactly. */
const VISIBLE_CARDS = 5;

/**
 * A target, not a requirement. Continue is never gated on it — nothing picked
 * still advances, on the top five as a fallback — so the copy has to read as
 * advice rather than a lock. An open "pick some" prompt gets fewer picks than
 * a number to aim at, and three seeds genuinely does beat one.
 */
const PICK_GOAL = 3;

interface Props {
  recommendations: ReturnType<typeof useRecommendedCards>;
  selectedUrls: string[];
  onToggleUrl: (url: string) => void;
  hasTopics: boolean;
  /** False until stored progress has been read — see useOnboardingProgress. */
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

  const pages = data?.pages ?? [];
  const allUrls = pages.flatMap((page) => page.urls);
  const latestUrls = pages[pages.length - 1]?.urls ?? [];

  // Five at a time: the current page, plus anything picked on an earlier one.
  // "Show different cards" fetches the next page and swaps the row for it, but
  // a pick is never dropped — losing one because you wanted to see other
  // options would silently edit what stage 3 gets, and this screen shows no
  // count that would make that visible.
  //
  // Always in fetch order, never re-sorted by picked. Selecting a card must
  // not move it: a row that jumps the moment you click it makes aiming at the
  // next one a guess.
  const latestUrlSet = new Set(latestUrls.map((view) => view.url));
  const seen = new Set<string>();

  const urls = allUrls
    .filter((view) => {
      // Pages are randomised server-side, so the same URL can come back on two
      // of them — and two cards with the same key is a React warning and a
      // duplicated row.
      if (seen.has(view.url)) return false;
      seen.add(view.url);

      return (
        latestUrlSet.has(view.url) || props.selectedUrls.includes(view.url)
      );
    })
    .slice(0, VISIBLE_CARDS);

  // With every slot taken by a pick there is nothing for a new page to show,
  // so the button would fetch and appear to do nothing.
  const canRefresh = hasNextPage && props.selectedUrls.length < VISIBLE_CARDS;

  const pickedCount = props.selectedUrls.length;
  const goalReached = pickedCount >= PICK_GOAL;

  // A full string per branch rather than one assembled around the number:
  // word order and plural rules differ by language.
  const goalLabel =
    pickedCount === 0
      ? `Pick ${PICK_GOAL} for the best suggestions`
      : goalReached
        ? 'Plenty to go on — pick more if you like'
        : `${pickedCount} of ${PICK_GOAL} picked`;

  const refreshButton = (
    <Button
      size="sm"
      variant="light"
      color="gray"
      radius={'xl'}
      leftSection={<TbRefresh size={16} />}
      onClick={() => fetchNextPage()}
      loading={isFetchingNextPage}
      style={{ flex: '0 0 auto' }}
    >
      Show different cards
    </Button>
  );

  return (
    <Stack gap={'md'}>
      {/* Wraps rather than nowrap: it is the only refresh control now, so at
          narrow widths it has to drop below the copy instead of squeezing it
          into a column. */}
      <Group justify="space-between" align="flex-start" gap={'md'}>
        <Stack gap={4} miw={0}>
          <Title order={1}>What catches your eye?</Title>
          {/* Two short sentences: the meter below now carries "how many", so
              this only has to say what the picks are for — and that nothing is
              being saved, since a card you can select reads as "add this to my
              library" unless the copy says otherwise. */}
          <Text c={'dimmed'}>
            Nothing is saved here. Your picks shape the people and collections
            we suggest next.
          </Text>
        </Stack>

        {/* Beside the heading, and only here — a second copy under five short
            cards was reachable without scrolling anyway, so it was two
            controls doing one job. */}
        {canRefresh && refreshButton}
      </Group>

      {/* The soft goal. Only shown once there is something to pick — during
          loading, an error or an empty result it would be asking for three of
          nothing. */}
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

      {/* Five cards across three columns — a full row of three and a short row
          of two, which reads as a set rather than a queue. The same grid shape
          as stage 1, so the two picking stages look like one another.

          One column at the narrowest width: two 44px thumbnails plus two
          columns of clamped text in 320px leaves the titles unreadable. */}
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
    </Stack>
  );
}
