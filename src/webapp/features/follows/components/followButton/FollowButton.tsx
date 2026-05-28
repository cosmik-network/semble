'use client';

import { Button, ButtonProps } from '@mantine/core';
import { startTransition } from 'react';
import { useToggleFollow } from '../../lib/mutations/useToggleFollow';

interface Props
  extends Omit<ButtonProps, 'onClick' | 'variant' | 'color' | 'children'> {
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
  initialIsFollowing,
  followText,
  ...buttonProps
}: Props) {
  const { isFollowing, toggleAction, setOptimisticIsFollowing } =
    useToggleFollow(initialIsFollowing ?? false);

  return (
    <Button
      variant={isFollowing ? 'light' : 'filled'}
      color={isFollowing ? 'gray' : 'dark'}
      {...buttonProps}
      onClick={() => {
        startTransition(() => {
          setOptimisticIsFollowing(!isFollowing);
          toggleAction({ targetId, targetType });
        });
      }}
    >
      {isFollowing ? 'Following' : (followText ?? 'Follow')}
    </Button>
  );
}
