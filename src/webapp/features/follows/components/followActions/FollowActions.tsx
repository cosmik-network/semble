'use client';

import { SubscriptionScope } from '@semble/types';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import FollowButton from '../followButton/FollowButton';
import SubscribeButton from '../subscribeButton/SubscribeButton';
import { useFollowState } from '../../lib/queries/useFollowState';
import { FollowTargetType } from '../../lib/types';

interface Props {
  targetId: string;
  targetType: FollowTargetType;
  followText?: string;
  initialIsFollowing?: boolean;
  initialIsSubscribed?: boolean;
  initialSubscriptionScopes?: SubscriptionScope[];
}

export default function FollowActions(props: Props) {
  const { isFollowing } = useFollowState(
    { targetId: props.targetId, targetType: props.targetType },
    props.initialIsFollowing,
  );
  const { data: featureFlags } = useFeatureFlags();

  return (
    <>
      {isFollowing && featureFlags?.subscriptions && (
        <SubscribeButton
          targetId={props.targetId}
          targetType={props.targetType}
          initialIsSubscribed={props.initialIsSubscribed}
          initialScopes={props.initialSubscriptionScopes}
        />
      )}
      <FollowButton
        targetId={props.targetId}
        targetType={props.targetType}
        initialIsFollowing={props.initialIsFollowing}
        followText={props.followText}
      />
    </>
  );
}
