'use client';

import { Button } from '@mantine/core';
import { startTransition } from 'react';
import { useToggleFollow } from '../../lib/mutations/useToggleFollow';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

interface Props {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  targetHandle?: string;
  initialIsFollowing?: boolean;
  followText?: string;
}

export default function FollowButton(props: Props) {
  const { data: featureFlags } = useFeatureFlags();
  const { isFollowing, toggleAction, setOptimisticIsFollowing } =
    useToggleFollow(props.initialIsFollowing ?? false);

  if (!featureFlags?.following) {
    return null;
  }

  return (
    <Button
      onClick={() =>
        startTransition(() => {
          setOptimisticIsFollowing(!isFollowing);
          toggleAction({
            targetId: props.targetId,
            targetType: props.targetType,
          });
        })
      }
      variant={isFollowing ? 'light' : 'filled'}
      color={isFollowing ? 'gray' : 'dark'}
    >
      {isFollowing ? 'Following' : (props.followText ?? 'Follow')}
    </Button>
  );
}
