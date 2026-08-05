'use client';

import {
  Avatar,
  Badge,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import useRecommendedUsers from '../../../lib/queries/useRecommendedUsers';
import useRecommendedCollections from '../../../lib/queries/useRecommendedCollections';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { LinkAnchor } from '@/components/link/MantineLink';

const VISIBLE_USERS = 8;
const VISIBLE_COLLECTIONS = 6;

interface Props {
  urls: string[];
}

export default function FollowStep(props: Props) {
  const users = useRecommendedUsers({ urls: props.urls });
  const collections = useRecommendedCollections({ urls: props.urls });

  const hasUrls = props.urls.length > 0;
  const isPending = hasUrls && (users.isPending || collections.isPending);

  // Without this the empty branch fires on a failed fetch and tells the user
  // there is nothing to recommend — which reads as "your network is empty",
  // not "the request failed". Mirrors SaveCardsStep.
  const isError = users.isError || collections.isError;

  const visibleUsers = users.data?.users.slice(0, VISIBLE_USERS) ?? [];
  const visibleCollections =
    collections.data?.collections.slice(0, VISIBLE_COLLECTIONS) ?? [];

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>Find people and collections to follow</Title>
        <Text c={'dimmed'}>
          Collections are curated lists of cards, kept by one or more people.
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
          <Title order={3}>People</Title>
          {visibleUsers.map((user) => (
            <Card key={user.id} withBorder radius={'lg'} p={'sm'}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={'xs'} wrap="nowrap" miw={0}>
                  <Avatar
                    src={user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
                    alt={`${user.handle}'s avatar`}
                  />
                  <Stack gap={0} miw={0}>
                    <Group gap={'xs'} wrap="nowrap">
                      <Text fw={600} c={'bright'} lineClamp={1}>
                        {user.name}
                      </Text>
                      {user.followsOnBsky && (
                        <Badge variant="light" color="blue" flex={'0 0 auto'}>
                          Followed on Bluesky
                        </Badge>
                      )}
                    </Group>
                    <Text fw={600} c={'dimmed'} fz={'sm'} lineClamp={1}>
                      @{user.handle}
                    </Text>
                    {user.description && (
                      <Text fz={'sm'} lineClamp={1}>
                        {user.description}
                      </Text>
                    )}
                  </Stack>
                </Group>
                <FollowButton
                  targetId={user.id}
                  targetType="USER"
                  initialIsFollowing={user.isFollowing}
                />
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {visibleCollections.length > 0 && (
        <Stack gap={'xs'}>
          <Title order={3}>Collections</Title>
          <Grid>
            {visibleCollections.map((collection) => (
              <Grid.Col key={collection.id} span={{ base: 12, sm: 6 }}>
                <Stack gap={'xs'} h={'100%'}>
                  <CollectionCard collection={collection} showAuthor />
                  <Group justify="space-between">
                    {collection.authorFollowedOnBsky ? (
                      <Badge variant="light" color="blue">
                        Author followed on Bluesky
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <FollowButton
                      targetId={collection.id}
                      targetType="COLLECTION"
                      initialIsFollowing={collection.isFollowing}
                    />
                  </Group>
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}
