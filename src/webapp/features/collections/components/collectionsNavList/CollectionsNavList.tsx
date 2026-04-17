'use client';

import { Group, NavLink, Stack, Text } from '@mantine/core';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import useMyCollections from '../../lib/queries/useMyCollections';
import CollectionsNavListError from './Error.CollectionsNavList';
import CreateCollectionShortcut from '../createCollectionShortcut/CreateCollectionShortcut';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { getRecordKey } from '@/lib/utils/atproto';
import { useNavbarContext } from '@/providers/navbar';
import useFollowingCollections from '@/features/follows/lib/queries/useFollowingCollections';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { LinkButton, LinkNavLink } from '@/components/link/MantineLink';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';

export default function CollectionsNavList() {
  const { toggleMobile } = useNavbarContext();
  const { settings, updateSetting } = useUserSettings();
  const { data, error } = useMyCollections({ limit: 30 });
  const { data: profile, error: profileError } = useMyProfile();
  const { data: followingCollections, error: errorFollowingCollections } =
    useFollowingCollections({ identifier: profile.handle, limit: 30 });
  const {
    data: contributedToCollections,
    error: errorContributedToCollections,
  } = useOpenCollectionsWithContributor({
    identifier: profile.handle,
    limit: 30,
  });

  if (
    error ||
    errorFollowingCollections ||
    errorContributedToCollections ||
    profileError
  ) {
    return <CollectionsNavListError />;
  }

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const followedCollections =
    followingCollections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const contributedCollections =
    contributedToCollections?.pages.flatMap((page) => page.collections ?? []) ??
    [];

  return (
    <Stack gap={'xs'}>
      <Group justify="space-between">
        <Text fz={'sm'} fw={600} c={'gray'}>
          Collections
        </Text>

        <Group gap={'xs'}>
          <LinkButton
            href={`/profile/${profile.handle}/collections`}
            variant="light"
            radius={'xl'}
            size="xs"
            color="blue"
            onClick={toggleMobile}
          >
            View all
          </LinkButton>
          <CreateCollectionShortcut />
        </Group>
      </Group>

      <Stack gap={0}>
        <NavLink
          label="My Collections"
          c={'gray'}
          opened={settings.collectionsNavExpanded}
          onChange={(opened) => updateSetting('collectionsNavExpanded', opened)}
        >
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
            <LinkNavLink
              href={`/profile/${profile.handle}/collections`}
              label="View all"
              variant="subtle"
              c="blue"
              onClick={toggleMobile}
            />
          </Stack>
        </NavLink>

        <NavLink
          label="Following"
          c={'gray'}
          opened={settings.followingNavExpanded}
          onChange={(opened) => updateSetting('followingNavExpanded', opened)}
        >
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
            <LinkNavLink
              href={`/profile/${profile.handle}/network/collections-following`}
              label="View all"
              variant="subtle"
              c="blue"
              onClick={toggleMobile}
            />
          </Stack>
        </NavLink>

        <NavLink
          label="Contributed To"
          c={'gray'}
          opened={settings.contributedToNavExpanded}
          onChange={(opened) =>
            updateSetting('contributedToNavExpanded', opened)
          }
        >
          <Stack gap={0}>
            {contributedCollections.map((collection) => (
              <CollectionNavItem
                key={collection.id}
                name={collection.name}
                url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!!)}`}
                cardCount={collection.cardCount}
                accessType={collection.accessType}
                uri={collection.uri}
              />
            ))}
            <LinkNavLink
              href={`/profile/${profile.handle}/network/contributed-to`}
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
