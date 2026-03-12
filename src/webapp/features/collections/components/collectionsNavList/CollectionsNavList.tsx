'use client';

import Link from 'next/link';
import { Button, Group, NavLink, Stack, Text } from '@mantine/core';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import useMyCollections from '../../lib/queries/useMyCollections';
import CollectionsNavListError from './Error.CollectionsNavList';
import CreateCollectionShortcut from '../createCollectionShortcut/CreateCollectionShortcut';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { getRecordKey } from '@/lib/utils/atproto';
import { useNavbarContext } from '@/providers/navbar';
import useFollowingCollections from '@/features/follows/lib/queries/useFollowingCollections';

export default function CollectionsNavList() {
  const { toggleMobile } = useNavbarContext();
  const { data, error } = useMyCollections({ limit: 30 });
  const { data: profile, error: profileError } = useMyProfile();
  const { data: followingCollections, error: errorFollowingCollections } =
    useFollowingCollections({ identifier: profile.handle, limit: 30 });

  if (error || errorFollowingCollections || profileError) {
    return <CollectionsNavListError />;
  }

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const followedCollections =
    followingCollections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Stack gap={'xs'}>
      <Group justify="space-between">
        <Text fw={600} c={'gray'}>
          Collections
        </Text>

        <Group gap={'xs'}>
          <Button
            component={Link}
            href={`/profile/${profile.handle}/collections`}
            variant="light"
            radius={'xl'}
            size="xs"
            color="blue"
            onClick={toggleMobile}
          >
            View all
          </Button>
          <CreateCollectionShortcut />
        </Group>
      </Group>

      <Stack gap={0}>
        <NavLink label="My Collections" c={'gray'}>
          <Stack gap={0}>
            {collections.map((collection) => (
              <CollectionNavItem
                key={collection.id}
                name={collection.name}
                url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!!)}`}
                cardCount={collection.cardCount}
                accessType={collection.accessType}
                uri={collection.uri}
              />
            ))}
            <NavLink
              component={Link}
              href={`/profile/${profile.handle}/collections`}
              label="View all"
              variant="subtle"
              c="blue"
              onClick={toggleMobile}
            />
          </Stack>
        </NavLink>

        <NavLink label="Following" c={'gray'}>
          <Stack gap={0}>
            {followedCollections.map((collection) => (
              <CollectionNavItem
                key={collection.id}
                name={collection.name}
                url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!!)}`}
                cardCount={collection.cardCount}
                accessType={collection.accessType}
                uri={collection.uri}
              />
            ))}
            <NavLink
              component={Link}
              href={`/profile/${profile.handle}/network/collections-following`}
              label="View all"
              variant="subtle"
              c="blue"
              onClick={toggleMobile}
            />
          </Stack>
        </NavLink>
      </Stack>
    </Stack>
  );
}
