'use client';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import useRecommendedUsers from '../../lib/queries/useRecommendedUsers';
import useRecommendedCollections from '../../lib/queries/useRecommendedCollections';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';

// Keep the pane scannable — the endpoints return up to 40 users / 20 collections
const VISIBLE_USERS = 8;
const VISIBLE_COLLECTIONS = 6;

interface Props {
  urls: string[];
  onBack: () => void;
  onComplete: () => void;
}

export default function FollowPane(props: Props) {
  const users = useRecommendedUsers({ urls: props.urls });
  const collections = useRecommendedCollections({ urls: props.urls });

  const hasUrls = props.urls.length > 0;
  const isPending = hasUrls && (users.isPending || collections.isPending);
  const visibleUsers = users.data?.users.slice(0, VISIBLE_USERS) ?? [];
  const visibleCollections =
    collections.data?.collections.slice(0, VISIBLE_COLLECTIONS) ?? [];

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>Find people and collections to follow</Title>
        <Text c={'gray'}>
          Collections are curated lists of links managed by one or more Semble
          users.
        </Text>
      </Stack>

      {isPending && (
        <Center py={'xl'}>
          <Stack align="center" gap={'xs'}>
            <Loader />
            <Text c={'gray'}>Finding people and collections...</Text>
          </Stack>
        </Center>
      )}

      {!isPending &&
        visibleUsers.length === 0 &&
        visibleCollections.length === 0 && (
          <Text c={'gray'}>
            Nothing to recommend just yet — you can find people and collections
            on the explore page.
          </Text>
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
                    <Text fw={600} c={'gray'} fz={'sm'} lineClamp={1}>
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

      <Group justify="space-between">
        <Button variant="subtle" color="gray" onClick={props.onBack}>
          Back
        </Button>
        <Button color="dark" onClick={props.onComplete}>
          Complete
        </Button>
      </Group>
    </Stack>
  );
}
