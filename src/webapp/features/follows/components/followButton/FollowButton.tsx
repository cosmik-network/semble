'use client';

import { Button } from '@mantine/core';
import { useState, useEffect } from 'react';
import useFollowTarget from '../../lib/mutations/useFollowTarget';
import useUnfollowTarget from '../../lib/mutations/useUnfollowTarget';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { isApprovedHandle } from '@/lib/approvedHandles';

interface Props {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  targetHandle?: string; // Handle of the user or collection author
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
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const followMutation = useFollowTarget();
  const unfollowMutation = useUnfollowTarget();

  // Sync local state when the prop changes (e.g., after query refetch)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Check if following feature is enabled for current user and target user is approved
  const isFollowingEnabled =
    featureFlags?.following && isApprovedHandle(targetHandle);

  // Return early only AFTER all hooks have been called
  if (!isFollowingEnabled) {
    return null;
  }

  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = async () => {
    if (isFollowing) {
      setIsFollowing(false);
      unfollowMutation.mutate(
        { targetId, targetType },
        {
          onError: () => {
            setIsFollowing(true);
          },
        },
      );
    } else {
      setIsFollowing(true);
      followMutation.mutate(
        { targetId, targetType },
        {
          onError: () => {
            setIsFollowing(false);
          },
        },
      );
    }
  };

  return (
    <Button
      onClick={handleClick}
      loading={isLoading}
      variant={isFollowing ? 'light' : 'filled'}
      color={isFollowing ? 'gray' : 'dark'}
    >
      {isFollowing ? 'Following' : followText}
    </Button>
  );
}
