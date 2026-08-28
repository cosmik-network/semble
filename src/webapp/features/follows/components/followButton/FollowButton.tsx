'use client';

import { Button, ButtonProps, ElementProps } from '@mantine/core';
import { FollowSource } from '@/features/analytics/types';
import { useFollowState } from '../../lib/queries/useFollowState';
import { useToggleFollow } from '../../lib/mutations/useToggleFollow';
import { FollowTargetType } from '../../lib/types';

interface Props
  extends
    Omit<ButtonProps, 'variant' | 'color' | 'children'>,
    ElementProps<'button', keyof ButtonProps> {
  targetId: string;
  targetType: FollowTargetType;
  initialIsFollowing?: boolean;
  followText?: string;
  /** Where the follow originated, reported to analytics. */
  followSource?: FollowSource;
  /** Fires with the new state once the write lands, never on the click alone. */
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  targetId,
  targetType,
  initialIsFollowing,
  followText,
  followSource,
  onFollowChange,
  ...buttonProps
}: Props) {
  const target = { targetId, targetType };
  const { isFollowing } = useFollowState(target, initialIsFollowing);
  const { toggleFollow } = useToggleFollow(target, followSource);

  return (
    <Button
      variant={isFollowing ? 'light' : 'inverse'}
      color="gray"
      {...buttonProps}
      onClick={(e) => {
        buttonProps.onClick?.(e);
        toggleFollow(onFollowChange);
      }}
    >
      {isFollowing ? 'Following' : (followText ?? 'Follow')}
    </Button>
  );
}
