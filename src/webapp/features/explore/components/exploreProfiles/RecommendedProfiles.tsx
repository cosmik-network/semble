'use client';

import useSuspenseRecommendedUsers from '@/features/profile/lib/queries/useSuspenseRecommendedUsers';
import ProfileSuggestionList from '@/features/profile/components/profileSuggestionList/ProfileSuggestionList';

// This endpoint returns more than the shelf has room for, so cap it here.
const SHELF_SIZE = 10;

interface Props {
  /** Non-empty; the parent doesn't mount this without seeds. */
  seedUrls: string[];
}

export default function RecommendedProfiles(props: Props) {
  const { data } = useSuspenseRecommendedUsers({ urls: props.seedUrls });

  return (
    <ProfileSuggestionList
      layout="scroller"
      emptyMessage="No profiles to suggest yet"
      users={data.users.slice(0, SHELF_SIZE)}
    />
  );
}
