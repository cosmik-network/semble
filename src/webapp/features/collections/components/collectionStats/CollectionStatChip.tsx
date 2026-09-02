'use client';

import {
  Avatar,
  AvatarGroup,
  Group,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { ReactNode } from 'react';
import { abbreviateNumber } from '@/lib/utils/text';

export const STAT_CHIP_AVATAR_SIZE = 26;

export interface StatChipAvatar {
  key: string;
  src?: string | null;
  alt: string;
}

interface Props {
  onClick: () => void;
  /** Shown when there are no avatars to preview. */
  icon: ReactNode;
  count: number;
  label: string;
  labelPlural: string;
  avatars?: StatChipAvatar[];
}

export default function CollectionStatChip(props: Props) {
  const avatars = props.avatars ?? [];

  return (
    <UnstyledButton onClick={props.onClick}>
      <Group gap={'xxs'} wrap="nowrap">
        {avatars.length > 0 ? (
          <AvatarGroup spacing={8}>
            {avatars.map((avatar) => (
              <Avatar
                key={avatar.key}
                size={STAT_CHIP_AVATAR_SIZE}
                src={avatar.src?.replace('avatar', 'avatar_thumbnail')}
                alt={avatar.alt}
              />
            ))}
          </AvatarGroup>
        ) : (
          <ThemeIcon
            variant="light"
            color="blue"
            size={STAT_CHIP_AVATAR_SIZE}
            radius="md"
          >
            {props.icon}
          </ThemeIcon>
        )}
        <Group gap={4} wrap="nowrap">
          <Text fw={700} fz="sm" c="bright" span>
            {abbreviateNumber(props.count)}
          </Text>
          <Text fw={500} fz="sm" c="dimmed" span>
            {props.count === 1 ? props.label : props.labelPlural}
          </Text>
        </Group>
      </Group>
    </UnstyledButton>
  );
}
