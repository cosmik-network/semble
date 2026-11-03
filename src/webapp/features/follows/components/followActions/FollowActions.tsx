'use client';

import { SubscriptionScope } from '@semble/types';
import { FollowSource } from '@/features/analytics/types';
import FollowButton from '../followButton/FollowButton';
import SubscribeButton from '../subscribeButton/SubscribeButton';
import { useFollowState } from '../../lib/queries/useFollowState';
import { FollowTargetType } from '../../lib/types';

interface Props {
  targetId: string;
  targetType: FollowTargetType;
  followText?: string;
  followSource?: FollowSource;
  initialIsFollowing?: boolean;
  initialIsSubscribed?: boolean;
  initialSubscriptionScopes?: SubscriptionScope[];
  /** Fires with the new state once the write lands. */
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowActions(props: Props) {
  const { isFollowing } = useFollowState(
    { targetId: props.targetId, targetType: props.targetType },
    props.initialIsFollowing,
  );

  return (
    <>
      {isFollowing && (
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
        followSource={props.followSource}
        onFollowChange={props.onFollowChange}
      />
    </>
  );
}
