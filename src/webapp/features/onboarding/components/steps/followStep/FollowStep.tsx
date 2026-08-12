'use client';

import {
  Badge,
  Box,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import useRecommendedUsers from '../../../lib/queries/useRecommendedUsers';
import useRecommendedCollections from '../../../lib/queries/useRecommendedCollections';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { LinkAnchor } from '@/components/link/MantineLink';
import BlueskyNote from '../../blueskyNote/BlueskyNote';
import SuggestionCard from '../../suggestionCard/SuggestionCard';
import StepHeading from '../../stepHeading/StepHeading';

const VISIBLE_USERS = 8;
const VISIBLE_COLLECTIONS = 6;

interface Props {
  urls: string[];
  /** False until stored progress has been read — see useOnboardingProgress. */
  progressLoaded: boolean;
}

export default function FollowStep(props: Props) {
  const users = useRecommendedUsers({ urls: props.urls });
  const collections = useRecommendedCollections({ urls: props.urls });

  const hasUrls = props.urls.length > 0;

  // !progressLoaded is the "we don't know yet" frame — without it the empty
  // branch wins for one frame before the spinner. hasUrls covers the opposite
  // case: with nothing stored the queries stay disabled at isPending: true
  // forever, so gating on that alone would spin without end.
  const isPending =
    !props.progressLoaded ||
    (hasUrls && (users.isPending || collections.isPending));

  // Without this a failed fetch reads as "your network is empty" rather than
  // "the request failed".
  const isError = users.isError || collections.isError;

  // One request, two lists: every user carries followsOnBsky, so the second tab
  // is a filter rather than a second fetch. The limit applies per tab, so the
  // Bluesky list is not cut short by the recommendations preceding it.
  const allUsers = users.data?.users ?? [];
  const visibleUsers = allUsers.slice(0, VISIBLE_USERS);
  const bskyUsers = allUsers
    .filter((user) => user.followsOnBsky)
    .slice(0, VISIBLE_USERS);

  // Counted before those already followed here are dropped — it is what tells
  // "none of them are on Semble" apart from "you already follow all of them".
  const bskyFollowedCount = users.data?.bskyFollowedSembleUserCount ?? 0;

  const visibleCollections =
    collections.data?.collections.slice(0, VISIBLE_COLLECTIONS) ?? [];

  const sectionHeader = (label: string, count?: number) => (
    <Group gap={'xs'} align="center" wrap="nowrap">
      <Title order={2} fz={'xl'} fw={600}>
        {label}
      </Title>

      {count !== undefined && (
        <Badge circle variant="light" color="gray" size={'lg'}>
          {count}
        </Badge>
      )}
    </Group>
  );

  const followButton = (
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
    isFollowing?: boolean,
  ) => (
    <FollowButton
      targetId={targetId}
      targetType={targetType}
      initialIsFollowing={isFollowing}
      style={{ flex: '0 0 auto' }}
    />
  );

  const userGrid = (list: typeof allUsers) => (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
      {list.map((user) => (
        <SuggestionCard
          key={user.id}
          href={`/profile/${user.handle}`}
          name={user.name}
          handle={user.handle}
          avatarUrl={user.avatarUrl}
          description={user.description}
          note={
            user.followsOnBsky && <BlueskyNote>Followed on Bluesky</BlueskyNote>
          }
          action={followButton(user.id, 'USER', user.isFollowing)}
        />
      ))}
    </SimpleGrid>
  );

  return (
    <Stack gap={'xl'}>
      <StepHeading
        title="Who to follow"
        description="Follow whatever looks interesting. Collections are curated lists of cards, kept by one or more people."
      />

      {isPending && (
        <Center py={'xl'}>
          <Stack align="center" gap={'xs'}>
            <Loader />
            <Text c={'dimmed'}>Finding people and collections…</Text>
          </Stack>
        </Center>
      )}

      {isError && (
        <Text c={'dimmed'}>
          Unable to load suggestions. Continue and find people to follow later.
        </Text>
      )}

      <Stack gap={50}>
        {/* Rendered whether or not there is anything in it — a tab bar that
            only appears when it has results is one nobody learns is there.
            Each panel says its own empty. */}
        {!isPending && !isError && (
          <Stack gap={'lg'}>
            {sectionHeader('People')}

            {/* Uncontrolled, so no state to hold: both lists come from one
                query that has already resolved. keepMounted={false} so only the
                tab you are looking at renders a grid. */}
            <Tabs defaultValue="recommended" keepMounted={false}>
              <Tabs.List mb={'md'}>
                <Tabs.Tab value="recommended" fw={600}>
                  Recommended
                </Tabs.Tab>
                <Tabs.Tab value="bluesky" fw={600}>
                  Your Bluesky circle
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="recommended">
                {visibleUsers.length > 0 ? (
                  userGrid(visibleUsers)
                ) : (
                  <Stack gap={4} align="flex-start">
                    <Text c={'dimmed'}>
                      Nothing to suggest from the cards you picked.
                    </Text>
                    <LinkAnchor href="/explore">Explore Semble</LinkAnchor>
                  </Stack>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="bluesky">
                {bskyUsers.length > 0 ? (
                  userGrid(bskyUsers)
                ) : (
                  // Two different empties: candidates already followed here are
                  // dropped server-side, so a returning user's tab empties as
                  // they follow people.
                  <Text c={'dimmed'}>
                    {bskyFollowedCount > 0
                      ? 'You already follow all of them here.'
                      : 'Nobody you follow on Bluesky is on Semble yet.'}
                  </Text>
                )}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}

        {visibleCollections.length > 0 && (
          <Stack gap={'lg'}>
            {sectionHeader('Collections', visibleCollections.length)}

            {/* CollectionCard owns its whole surface — the card itself
                navigates — so the follow control cannot live inside it and sits
                in a row beneath. */}
            <SimpleGrid
              cols={{ base: 1, sm: 2 }}
              spacing={'xs'}
              verticalSpacing={{ base: 'md', sm: 'xs' }}
            >
              {visibleCollections.map((collection) => (
                <Stack key={collection.id} gap={'xs'} h={'100%'}>
                  {/* flex={1} so the cards in a row match height and the follow
                      rows below them line up. */}
                  <Box flex={1}>
                    <CollectionCard collection={collection} showAuthor />
                  </Box>

                  <Group justify="space-between" wrap="nowrap" gap={'xs'}>
                    {collection.authorFollowedOnBsky ? (
                      <BlueskyNote>Author followed on Bluesky</BlueskyNote>
                    ) : (
                      // Holds the row so the button stays hard right.
                      <span />
                    )}

                    {followButton(
                      collection.id,
                      'COLLECTION',
                      collection.isFollowing,
                    )}
                  </Group>
                </Stack>
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
