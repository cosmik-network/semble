'use client';

import { Button } from '@mantine/core';
import { useState } from 'react';
import useFollowTarget from '../../lib/mutations/useFollowTarget';
import useUnfollowTarget from '../../lib/mutations/useUnfollowTarget';

interface Props {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  initialIsFollowing?: boolean;
  variant?: 'filled' | 'light' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function FollowButton({
  targetId,
  targetType,
  initialIsFollowing = false,
  variant = 'filled',
  size = 'sm',
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const followMutation = useFollowTarget();
  const unfollowMutation = useUnfollowTarget();

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
      variant={isFollowing ? 'outline' : variant}
      color={isFollowing ? 'gray' : 'blue'}
      size={size}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
