'use client';

import { Stack } from '@mantine/core';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useNavbarContext } from '@/providers/navbar';
import { useSettings } from '@/providers/settings';
import CollectionNavSection from './CollectionNavSection';
import {
  ContributedCollectionsNavItems,
  FollowingCollectionsNavItems,
  MyCollectionsNavItems,
} from './CollectionNavSectionItems';

export default function CollectionsNavListContent() {
  const { toggleMobile } = useNavbarContext();
  const { settings, updateSetting } = useSettings();
  const { data: profile } = useMyProfile();

  return (
    <Stack gap={0}>
      <CollectionNavSection
        label="My Collections"
        opened={settings.collectionsNavExpanded}
        onChange={(opened) => updateSetting('collectionsNavExpanded', opened)}
        viewAllHref={`/profile/${profile.handle}/collections`}
        onNavigate={toggleMobile}
      >
        <MyCollectionsNavItems />
      </CollectionNavSection>

      <CollectionNavSection
        label="Following"
        opened={settings.followingNavExpanded}
        onChange={(opened) => updateSetting('followingNavExpanded', opened)}
        viewAllHref={`/profile/${profile.handle}/network/collections-following`}
        onNavigate={toggleMobile}
      >
        <FollowingCollectionsNavItems identifier={profile.handle} />
      </CollectionNavSection>

      <CollectionNavSection
        label="Contributed To"
        opened={settings.contributedToNavExpanded}
        onChange={(opened) => updateSetting('contributedToNavExpanded', opened)}
        viewAllHref={`/profile/${profile.handle}/network/contributed-to`}
        onNavigate={toggleMobile}
      >
        <ContributedCollectionsNavItems identifier={profile.handle} />
      </CollectionNavSection>
    </Stack>
  );
}
