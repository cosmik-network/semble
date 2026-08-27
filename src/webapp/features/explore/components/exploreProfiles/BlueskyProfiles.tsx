'use client';

import useSuspenseBskyFollowedUsers from '@/features/follows/lib/queries/useSuspenseBskyFollowedUsers';
import ProfileSuggestionList from '@/features/profile/components/profileSuggestionList/ProfileSuggestionList';
import { FollowSource } from '@/features/analytics/types';

// One page of this size is the whole shelf — nothing fetches beyond it.
const SHELF_SIZE = 10;

/** People already followed on Bluesky who are on Semble but not followed here
 * yet — the same list settings shows under "Bluesky follows". */
export default function BlueskyProfiles() {
  const { data } = useSuspenseBskyFollowedUsers({ limit: SHELF_SIZE });

  return (
    <ProfileSuggestionList
      layout="scroller"
      followSource={FollowSource.BLUESKY_FOLLOWS}
      emptyMessage="No one from your Bluesky follows is here yet"
      users={data.pages.flatMap((page) => page.users)}
    />
  );
}
