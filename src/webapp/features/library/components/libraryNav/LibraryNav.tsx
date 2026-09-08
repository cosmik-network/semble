'use client';

import { Stack, Text } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { useState } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import StatDrawer from '@/components/statDrawer/StatDrawer';
import FollowingCollectionsContainer from '@/features/follows/containers/followingCollectionsContainer/FollowingCollectionsContainer';
import FollowingCollectionsContainerSkeleton from '@/features/follows/containers/followingCollectionsContainer/Skeleton.FollowingCollectionsContainer';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useSettings } from '@/providers/settings';
import {
  defaultSettings,
  UserSettings,
} from '@/features/settings/lib/queries/useUserSettings';
import MyCardsNavItems from '@/features/cards/components/cardNavItem/MyCardsNavItems';
import {
  ContributedCollectionsNavItems,
  FollowingCollectionsNavItems,
  MyCollectionsNavItems,
} from '@/features/collections/components/collectionsNavList/CollectionNavSectionItems';
import LibraryNavSection from './LibraryNavSection';

type ExpandedKey =
  | 'cardsNavExpanded'
  | 'collectionsNavExpanded'
  | 'followingNavExpanded'
  | 'contributedToNavExpanded';

export default function LibraryNav() {
  const { settings, updateSetting } = useSettings();
  const { data: profile } = useMyProfile();
  const [followingDrawerOpen, setFollowingDrawerOpen] = useState(false);

  // Stored flags would mismatch the server's collapsed HTML during hydration;
  // see useUserSettings.
  const mounted = useMounted();
  const expanded = (key: ExpandedKey) => ({
    opened: mounted ? settings[key] : defaultSettings[key],
    onChange: (opened: boolean) =>
      updateSetting(key, opened as UserSettings[ExpandedKey]),
  });

  const handle = profile.handle;

  return (
    <Stack gap={'xs'}>
      <Text fz={'sm'} fw={600} c={'gray'}>
        Library
      </Text>

      <Stack gap={0}>
        <LibraryNavSection
          label="Cards"
          icon={<FaRegNoteSticky size={20} />}
          viewAllHref={`/profile/${handle}/cards`}
          errorMessage="Could not load cards"
          {...expanded('cardsNavExpanded')}
        >
          <MyCardsNavItems />
        </LibraryNavSection>

        <LibraryNavSection
          label="My Collections"
          icon={<BiCollection size={20} />}
          viewAllHref={`/profile/${handle}/collections`}
          errorMessage="Could not load collections"
          {...expanded('collectionsNavExpanded')}
        >
          <MyCollectionsNavItems />
        </LibraryNavSection>

        <LibraryNavSection
          label="Following"
          icon={<BiCollection size={20} />}
          onViewAll={() => setFollowingDrawerOpen(true)}
          errorMessage="Could not load collections"
          {...expanded('followingNavExpanded')}
        >
          <FollowingCollectionsNavItems identifier={handle} />
        </LibraryNavSection>

        <LibraryNavSection
          label="Contributed To"
          icon={<BiCollection size={20} />}
          viewAllHref={`/profile/${handle}/contributions`}
          errorMessage="Could not load collections"
          {...expanded('contributedToNavExpanded')}
        >
          <ContributedCollectionsNavItems identifier={handle} />
        </LibraryNavSection>
      </Stack>

      <StatDrawer
        isOpen={followingDrawerOpen}
        onClose={() => setFollowingDrawerOpen(false)}
        title="Collections Following"
        skeleton={<FollowingCollectionsContainerSkeleton />}
        errorMessage="Could not load followed collections"
      >
        <FollowingCollectionsContainer handle={handle} />
      </StatDrawer>
    </Stack>
  );
}
