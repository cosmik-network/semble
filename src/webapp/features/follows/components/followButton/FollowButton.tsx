'use client';
import { Button } from '@mantine/core';
import { startTransition } from 'react';
import { useToggleFollow } from '../../lib/mutations/useToggleFollow';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { isApprovedHandle } from '@/lib/approvedHandles';

interface Props {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  targetHandle?: string;
  initialIsFollowing?: boolean;
  followText?: string;
}

export default function FollowButton({
  targetId,
  targetType,
  targetHandle,
  initialIsFollowing = false,
  followText = 'Follow',
}: Props) {
  const { data: featureFlags } = useFeatureFlags();
  const { isFollowing, toggleAction, setOptimisticIsFollowing } =
    useToggleFollow(initialIsFollowing);

  const isFollowingEnabled =
    featureFlags?.following && isApprovedHandle(targetHandle);

  if (!isFollowingEnabled) {
    return null;
  }

  return (
    <Button
      onClick={() =>
        startTransition(() => {
          setOptimisticIsFollowing(!isFollowing);
          toggleAction({ targetId, targetType });
        })
      }
      variant={isFollowing ? 'light' : 'filled'}
      color={isFollowing ? 'gray' : 'dark'}
    >
      {isFollowing ? 'Following' : followText}
    </Button>
  );
}
