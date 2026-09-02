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

import { STAT_CHIP_AVATAR_SIZE } from './constants';

export interface StatChipAvatar {
  key: string;
  src?: string | null;
  alt: string;
}

interface Props {
  onClick: () => void;
  /** Shown when there are no avatars to preview; without it a placeholder avatar is used. */
  icon?: ReactNode;
  count?: number;
  label?: string;
  labelPlural?: string;
  /** Replaces the count + label text. */
  content?: ReactNode;
  avatars?: StatChipAvatar[];
}

export default function StatChip(props: Props) {
  const avatars = props.avatars ?? [];

  return (
    <UnstyledButton onClick={props.onClick}>
      <Group gap={'xxs'} wrap="nowrap">
        {avatars.length > 1 ? (
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
        ) : avatars.length === 1 ? (
          <Avatar
            size={STAT_CHIP_AVATAR_SIZE}
            src={avatars[0].src?.replace('avatar', 'avatar_thumbnail')}
            alt={avatars[0].alt}
          />
        ) : props.icon ? (
          <ThemeIcon
            variant="light"
            color="blue"
            size={STAT_CHIP_AVATAR_SIZE}
            radius="md"
          >
            {props.icon}
          </ThemeIcon>
        ) : (
          <Avatar size={STAT_CHIP_AVATAR_SIZE} />
        )}
        {props.content ?? (
          <Group gap={4} wrap="nowrap">
            <Text fw={700} fz="sm" c="bright" span>
              {abbreviateNumber(props.count ?? 0)}
            </Text>
            <Text fw={500} fz="sm" c="dimmed" span>
              {props.count === 1 ? props.label : props.labelPlural}
            </Text>
          </Group>
        )}
      </Group>
    </UnstyledButton>
  );
}
