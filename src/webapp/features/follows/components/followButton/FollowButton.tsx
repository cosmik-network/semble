'use client';

import { Button } from '@mantine/core';
import { useState, useEffect } from 'react';
import useFollowTarget from '../../lib/mutations/useFollowTarget';
import useUnfollowTarget from '../../lib/mutations/useUnfollowTarget';

interface Props {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  initialIsFollowing?: boolean;
  variant?: 'filled' | 'light' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  followText?: string;
}

export default function FollowButton({
  targetId,
  targetType,
  initialIsFollowing = false,
  variant = 'filled',
  size = 'sm',
  followText = 'Follow',
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const followMutation = useFollowTarget();
  const unfollowMutation = useUnfollowTarget();

  // Sync local state when the prop changes (e.g., after query refetch)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

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
      variant={isFollowing ? 'outline' : 'light'}
      color={isFollowing ? 'gray' : 'cyan'}
      size={size}
    >
      {isFollowing ? 'Following' : followText}
    </Button>
  );
}
