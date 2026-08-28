'use client';

import type { User } from '@semble/types';
import SuggestionCard from '@/features/onboarding/components/suggestionCard/SuggestionCard';
import BlueskyNote from '@/features/onboarding/components/blueskyNote/BlueskyNote';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { FollowSource } from '@/features/analytics/types';

/** A user carrying the one extra fact a suggestion needs. The recommender
 * returns it; the Bluesky-follows query tags it on. */
export type SuggestedUser = User & { followsOnBsky: boolean };

interface Props {
  user: SuggestedUser;
  followSource?: FollowSource;
}

export default function ProfileSuggestionCard(props: Props) {
  return (
    <SuggestionCard
      href={`/profile/${props.user.handle}`}
      name={props.user.name}
      handle={props.user.handle}
      avatarUrl={props.user.avatarUrl}
      description={props.user.description}
      openInNewTab={false}
      note={
        props.user.followsOnBsky && (
          <BlueskyNote>Following on Bluesky</BlueskyNote>
        )
      }
      action={
        <FollowButton
          targetId={props.user.id}
          targetType="USER"
          initialIsFollowing={props.user.isFollowing}
          followSource={props.followSource}
          size="xs"
        />
      }
    />
  );
}
