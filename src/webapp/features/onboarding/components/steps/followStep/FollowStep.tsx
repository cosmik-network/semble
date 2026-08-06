'use client';

import {
  Avatar,
  Center,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import useRecommendedUsers from '../../../lib/queries/useRecommendedUsers';
import useRecommendedCollections from '../../../lib/queries/useRecommendedCollections';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { LinkAnchor } from '@/components/link/MantineLink';
import FollowSuggestionCard from '../../followSuggestionCard/FollowSuggestionCard';

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

  // !progressLoaded is the "we don't know yet" frame. Without it, urls is
  // still [] so the queries are disabled and nothing is pending, and the
  // empty branch below wins for one frame — "No suggestions yet" flashing
  // before the spinner. Keep hasUrls too: once progress has loaded and there
  // genuinely are no urls (a ?step=3 deep link with nothing stored), the
  // queries stay disabled at isPending: true forever, and gating on that
  // alone would spin without end.
  const isPending =
    !props.progressLoaded ||
    (hasUrls && (users.isPending || collections.isPending));

  // Without this the empty branch fires on a failed fetch and tells the user
  // there is nothing to recommend — which reads as "your network is empty",
  // not "the request failed". Mirrors PickCardsStep.
  const isError = users.isError || collections.isError;

  const visibleUsers = users.data?.users.slice(0, VISIBLE_USERS) ?? [];
  const visibleCollections =
    collections.data?.collections.slice(0, VISIBLE_COLLECTIONS) ?? [];

  // Small, quiet and consistent between the two groups. `order={2}` under the
  // stage's h1 keeps the outline honest; the size keeps it from competing.
  const sectionHeading = (label: string) => (
    <Title order={2} fz={'sm'} c={'dimmed'} tt="uppercase" lts={0.5}>
      {label}
    </Title>
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
      size="compact-sm"
      radius={'xl'}
      style={{ flex: '0 0 auto' }}
    />
  );

  return (
    <Stack gap={'lg'}>
      <Stack gap={4}>
        <Title order={1}>Who to follow</Title>
        <Text c={'dimmed'}>
          Follow whatever looks interesting. Collections are curated lists of
          cards, kept by one or more people.
        </Text>
      </Stack>

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

      {!isPending &&
        !isError &&
        visibleUsers.length === 0 &&
        visibleCollections.length === 0 && (
          <Stack gap={4} align="flex-start">
            <Text c={'dimmed'}>No suggestions yet.</Text>
            <LinkAnchor href="/explore">Explore Semble</LinkAnchor>
          </Stack>
        )}

      {visibleUsers.length > 0 && (
        <Stack gap={'xs'}>
          {sectionHeading('People')}

          {/* Two columns, the same grid rhythm as stage 2 — so the flow's
              three picking screens share one shape instead of each inventing
              its own. */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={'sm'}>
            {visibleUsers.map((user) => (
              <FollowSuggestionCard
                key={user.id}
                media={
                  <Avatar
                    src={user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
                    alt=""
                    size={38}
                    radius={'50%'}
                  />
                }
                title={user.name}
                meta={`@${user.handle}`}
                description={user.description}
                blueskyNote={
                  user.followsOnBsky ? 'Followed on Bluesky' : undefined
                }
                action={followButton(user.id, 'USER', user.isFollowing)}
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {visibleCollections.length > 0 && (
        <Stack gap={'xs'}>
          {sectionHeading('Collections')}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={'sm'}>
            {visibleCollections.map((collection) => (
              <FollowSuggestionCard
                key={collection.id}
                media={
                  // The app's collection glyph rather than the author's
                  // avatar: a face in that slot reads as "a person", which is
                  // exactly the distinction this section has to make.
                  <ThemeIcon
                    variant="light"
                    color="gray"
                    size={38}
                    radius={'md'}
                  >
                    <BiCollection size={18} />
                  </ThemeIcon>
                }
                title={collection.name}
                // Author and size in one line — who keeps it and how much is
                // in it are the two things that decide whether to follow.
                meta={
                  collection.cardCount === 1
                    ? `by @${collection.author.handle} · 1 card`
                    : `by @${collection.author.handle} · ${collection.cardCount} cards`
                }
                description={collection.description}
                blueskyNote={
                  collection.authorFollowedOnBsky
                    ? 'Author followed on Bluesky'
                    : undefined
                }
                action={followButton(
                  collection.id,
                  'COLLECTION',
                  collection.isFollowing,
                )}
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}
