'use client';

import { useState } from 'react';
import { SubscriptionScope } from '@semble/types';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import SubscribeButton from '@/features/follows/components/subscribeButton/SubscribeButton';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

interface Props {
  targetId: string;
  targetHandle: string;
  initialIsFollowing?: boolean;
  initialIsSubscribed?: boolean;
  initialScopes?: SubscriptionScope[];
}

export default function ProfileFollowActions({
  targetId,
  targetHandle,
  initialIsFollowing,
  initialIsSubscribed,
  initialScopes,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const { data: featureFlags } = useFeatureFlags();

  return (
    <>
      <FollowButton
        targetId={targetId}
        targetType="USER"
        targetHandle={targetHandle}
        initialIsFollowing={initialIsFollowing}
        onFollowChange={setIsFollowing}
      />
      {isFollowing && featureFlags?.subscriptions && (
        <SubscribeButton
          targetId={targetId}
          targetType="USER"
          initialIsSubscribed={initialIsSubscribed}
          initialScopes={initialScopes}
        />
      )}
    </>
  );
}
