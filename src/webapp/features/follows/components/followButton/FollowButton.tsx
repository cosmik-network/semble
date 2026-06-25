'use client';

import { Button, ButtonProps } from '@mantine/core';
import { useFollowState } from '../../lib/queries/useFollowState';
import { useToggleFollow } from '../../lib/mutations/useToggleFollow';
import { FollowTargetType } from '../../lib/types';

interface Props extends Omit<
  ButtonProps,
  'onClick' | 'variant' | 'color' | 'children'
> {
  targetId: string;
  targetType: FollowTargetType;
  initialIsFollowing?: boolean;
  followText?: string;
}

export default function FollowButton({
  targetId,
  targetType,
  initialIsFollowing,
  followText,
  ...buttonProps
}: Props) {
  const target = { targetId, targetType };
  const { isFollowing } = useFollowState(target, initialIsFollowing);
  const { toggleFollow } = useToggleFollow(target);

  return (
    <Button
      variant={isFollowing ? 'light' : 'filled'}
      color={isFollowing ? 'gray' : 'dark'}
      {...buttonProps}
      onClick={toggleFollow}
    >
      {isFollowing ? 'Following' : (followText ?? 'Follow')}
    </Button>
  );
}
