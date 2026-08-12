'use client';

import { NavLink, Stack } from '@mantine/core';
import { Collection } from '@semble/types';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import useMyCollections from '../../lib/queries/useMyCollections';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { getRecordKey } from '@/lib/utils/atproto';
import { useNavbarContext } from '@/providers/navbar';
import useFollowingCollections from '@/features/follows/lib/queries/useFollowingCollections';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { LinkNavLink } from '@/components/link/MantineLink';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';

const NAV_COLLECTIONS_LIMIT = 30;

interface SectionProps {
  label: string;
  opened: boolean;
  onChange: (opened: boolean) => void;
  collections: Collection[];
  viewAllHref: string;
  onNavigate: () => void;
}

function CollectionNavSection(props: SectionProps) {
  return (
    <NavLink
      label={props.label}
      c={'gray'}
      opened={props.opened}
      onChange={props.onChange}
    >
      <Stack gap={0}>
        {props.collections.map((collection) => (
          <CollectionNavItem
            key={collection.id}
            name={collection.name}
            url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!)}`}
            cardCount={collection.cardCount}
            accessType={collection.accessType}
            uri={collection.uri}
          />
        ))}
        <LinkNavLink
          href={props.viewAllHref}
          label="View all"
          variant="subtle"
          c="blue"
          onClick={props.onNavigate}
        />
      </Stack>
    </NavLink>
  );
}

export default function CollectionsNavListContent() {
  const { toggleMobile } = useNavbarContext();
  const { settings, updateSetting } = useUserSettings();
  const { data: profile } = useMyProfile();
  const { data: myCollections } = useMyCollections({
    limit: NAV_COLLECTIONS_LIMIT,
  });
  const { data: followingCollections } = useFollowingCollections({
    identifier: profile.handle,
    limit: NAV_COLLECTIONS_LIMIT,
  });
  const { data: contributedCollections } = useOpenCollectionsWithContributor({
    identifier: profile.handle,
    limit: NAV_COLLECTIONS_LIMIT,
  });

  const collections =
    myCollections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const followedCollections =
    followingCollections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const contributedToCollections =
    contributedCollections?.pages.flatMap((page) => page.collections ?? []) ??
    [];

  return (
    <Stack gap={0}>
      <CollectionNavSection
        label="My Collections"
        opened={settings.collectionsNavExpanded}
        onChange={(opened) => updateSetting('collectionsNavExpanded', opened)}
        collections={collections}
        viewAllHref={`/profile/${profile.handle}/collections`}
        onNavigate={toggleMobile}
      />

      <CollectionNavSection
        label="Following"
        opened={settings.followingNavExpanded}
        onChange={(opened) => updateSetting('followingNavExpanded', opened)}
        collections={followedCollections}
        viewAllHref={`/profile/${profile.handle}/network/collections-following`}
        onNavigate={toggleMobile}
      />

      <CollectionNavSection
        label="Contributed To"
        opened={settings.contributedToNavExpanded}
        onChange={(opened) => updateSetting('contributedToNavExpanded', opened)}
        collections={contributedToCollections}
        viewAllHref={`/profile/${profile.handle}/network/contributed-to`}
        onNavigate={toggleMobile}
      />
    </Stack>
  );
}
