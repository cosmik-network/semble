'use client';

import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Title,
} from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';
import { MdErrorOutline, MdPersonSearch } from 'react-icons/md';
import type useRecommendedUsers from '@/features/profile/lib/queries/useRecommendedUsers';
import type useRecommendedCollections from '@/features/collections/lib/queries/useRecommendedCollections';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { LinkButton } from '@/components/link/MantineLink';
import BlueskyNote from '../../blueskyNote/BlueskyNote';
import SuggestionCard from '../../suggestionCard/SuggestionCard';
import SuggestionCardSkeleton from '../../suggestionCard/Skeleton.SuggestionCard';
import StepHeading from '../../stepHeading/StepHeading';

// Exported because the container records what was suggested, and "suggested"
// has to mean the same set the user was shown.
export const VISIBLE_USERS = 8;
export const VISIBLE_COLLECTIONS = 6;

interface Props {
  // Owned by the container, which records what was suggested on the way out
  // and so has to see the same results this does.
  users: ReturnType<typeof useRecommendedUsers>;
  collections: ReturnType<typeof useRecommendedCollections>;
  hasUrls: boolean;
  progressLoaded: boolean;
  pickCardsHref: string;
  onPickMoreCards: () => void;
  onFollowChange: (
    targetType: 'USER' | 'COLLECTION',
    targetId: string,
    isFollowing: boolean,
  ) => void;
}

interface FollowActionButtonProps {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  isFollowing?: boolean;
  onFollowChange: Props['onFollowChange'];
}

function FollowActionButton({
  targetId,
  targetType,
  isFollowing,
  onFollowChange,
}: FollowActionButtonProps) {
  return (
    <FollowButton
      targetId={targetId}
      targetType={targetType}
      initialIsFollowing={isFollowing}
      onFollowChange={(next) => onFollowChange(targetType, targetId, next)}
      size="xs"
    />
  );
}

export default function FollowStep(props: Props) {
  const { users, collections } = props;

  const [peopleTab, setPeopleTab] = useState<'recommended' | 'bluesky'>(
    'recommended',
  );

  // !progressLoaded is the "we don't know yet" frame — without it the empty
  // branch wins for one frame. hasUrls covers the opposite case: with nothing
  // stored the queries stay disabled at isPending forever.
  const isPending =
    !props.progressLoaded ||
    (props.hasUrls && (users.isPending || collections.isPending));

  const isError = users.isError || collections.isError;

  // One request, two lists: every user carries followsOnBsky, so the second tab
  // is a filter rather than a second fetch. The limit applies per tab.
  const allUsers = users.data?.users ?? [];
  const visibleUsers = allUsers.slice(0, VISIBLE_USERS);
  const bskyUsers = allUsers
    .filter((user) => user.followsOnBsky)
    .slice(0, VISIBLE_USERS);

  // Counted server-side before those already followed are dropped, which is
  // what tells "none are on Semble" apart from "you already follow them all".
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

  const userGridSkeleton = (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
      {Array.from({ length: VISIBLE_USERS }).map((_, index) => (
        <SuggestionCardSkeleton key={index} />
      ))}
    </SimpleGrid>
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
            user.followsOnBsky && (
              <BlueskyNote>Following on Bluesky</BlueskyNote>
            )
          }
          action={
            <FollowActionButton
              targetId={user.id}
              targetType="USER"
              isFollowing={user.isFollowing}
              onFollowChange={props.onFollowChange}
            />
          }
        />
      ))}
    </SimpleGrid>
  );

  return (
    <Stack gap={'xl'}>
      <StepHeading
        title="Find people and collections to follow"
        description="These are the people curating the kind of content your just selected. Follow them or their collections to easily keep track of their activity. You can also connect with people you may already know from Bluesky."
      />

      {isError && (
        <Box py={'xl'}>
          <ProfileEmptyTab
            message="Unable to load suggestions"
            icon={MdErrorOutline}
            button={
              <Button
                variant="light"
                onClick={() => {
                  users.refetch();
                  collections.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        </Box>
      )}

      <Stack gap={50}>
        {!isError && (
          <Stack gap={'lg'}>
            {sectionHeader('People')}

            <SegmentedControl
              value={peopleTab}
              onChange={(value) =>
                setPeopleTab(value as 'recommended' | 'bluesky')
              }
              size="md"
              w={'fit-content'}
              data={[
                { label: 'Recommended', value: 'recommended' },
                {
                  label: (
                    <Group gap={6} wrap="nowrap" justify="center">
                      <FaBluesky size={14} />
                      <span>Followed on Bluesky</span>
                    </Group>
                  ),
                  value: 'bluesky',
                },
              ]}
              mb={'md'}
            />

            {peopleTab === 'recommended' &&
              (isPending ? (
                userGridSkeleton
              ) : visibleUsers.length > 0 ? (
                userGrid(visibleUsers)
              ) : (
                <Box py={'xl'}>
                  <ProfileEmptyTab
                    message="No suggestions yet"
                    icon={MdPersonSearch}
                    button={
                      <LinkButton
                        href={props.pickCardsHref}
                        onClick={props.onPickMoreCards}
                        variant="light"
                        color="gray"
                      >
                        Pick more cards
                      </LinkButton>
                    }
                  />
                </Box>
              ))}

            {peopleTab === 'bluesky' &&
              (isPending ? (
                userGridSkeleton
              ) : bskyUsers.length > 0 ? (
                userGrid(bskyUsers)
              ) : (
                <Box py={'xl'}>
                  <ProfileEmptyTab
                    message={
                      bskyFollowedCount > 0
                        ? 'You already follow all of them here'
                        : 'Nobody you follow on Bluesky is on Semble yet'
                    }
                    icon={FaBluesky}
                  />
                </Box>
              ))}
          </Stack>
        )}

        {(isPending || visibleCollections.length > 0) && (
          <Stack gap={'lg'}>
            {sectionHeader(
              'Collections',
              isPending ? undefined : visibleCollections.length,
            )}

            <SimpleGrid
              cols={{ base: 1, sm: 2 }}
              spacing={'xs'}
              verticalSpacing={{ base: 'md', sm: 'xs' }}
            >
              {isPending &&
                Array.from({ length: VISIBLE_COLLECTIONS }).map((_, index) => (
                  <CollectionCardSkeleton key={index} />
                ))}

              {visibleCollections.map((collection) => (
                <Stack key={collection.id} gap={'xs'} h={'100%'}>
                  <Box flex={1}>
                    <CollectionCard
                      collection={collection}
                      showAuthor
                      onFollowChange={(next) =>
                        props.onFollowChange('COLLECTION', collection.id, next)
                      }
                    />
                  </Box>

                  {collection.authorFollowedOnBsky && (
                    <BlueskyNote>Author followed on Bluesky</BlueskyNote>
                  )}
                </Stack>
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
