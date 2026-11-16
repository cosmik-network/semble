'use client';

import {
  ActionIcon,
  CopyButton,
  Group,
  Paper,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { BiCopy } from 'react-icons/bi';
import { IoMdCheckmark } from 'react-icons/io';
import { IoEyeOutline } from 'react-icons/io5';
import type { User } from '@semble/types';
import { LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  name: string;
  author: User | null;
}

// The theme's md control radius (8px) plus the padding and border, so the
// corners stay concentric
export const PADDING = 6;
export const RADIUS = 8 + PADDING + 1;

// The share link itself, without any search params
const shareLink = () => `${window.location.origin}${window.location.pathname}`;

function Surface(props: { children: ReactNode; pl: number }) {
  return (
    <Paper
      withBorder
      shadow="sm"
      radius={RADIUS}
      p={PADDING}
      pl={props.pl}
      miw={0}
      style={{ pointerEvents: 'all' }}
    >
      <Group gap={8} wrap="nowrap">
        {props.children}
      </Group>
    </Paper>
  );
}

export default function SharedHeader(props: Props) {
  const author = props.author;
  const authorName = author ? author.name || `@${author.handle}` : null;

  return (
    <Group
      gap={6}
      wrap="nowrap"
      m="xs"
      w="max-content"
      // Leaves room for the logo card at the other edge: its ~42px plus margins
      maw="calc(100vw - 4 * var(--mantine-spacing-xs) - 42px)"
    >
      <Surface pl={author ? PADDING : PADDING + 6}>
        {author && (
          <Tooltip label={`By ${authorName}`} withArrow withinPortal={false}>
            <LinkAvatar
              href={`/profile/${author.handle}`}
              src={author.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
              alt={`By ${authorName}`}
              size={28}
            />
          </Tooltip>
        )}
        <Text fw={700} truncate maw={320} miw={0} title={props.name}>
          {props.name}
        </Text>
        {/* Focusable so keyboard users reach the tooltip too */}
        <Tooltip label="View only" withArrow withinPortal={false}>
          <ThemeIcon
            variant="light"
            color="gray"
            size="sm"
            role="img"
            aria-label="View only"
            tabIndex={0}
            style={{ flexShrink: 0 }}
          >
            <IoEyeOutline size={14} />
          </ThemeIcon>
        </Tooltip>
      </Surface>
      <Surface pl={PADDING}>
        <CopyButton value={shareLink()} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? 'Copied' : 'Copy link'}
              withArrow
              withinPortal={false}
            >
              <ActionIcon
                onClick={copy}
                variant="subtle"
                size="md"
                color={copied ? 'green' : 'gray'}
                aria-label={copied ? 'Link copied' : 'Copy canvas link'}
              >
                {copied ? <IoMdCheckmark size={18} /> : <BiCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Surface>
    </Group>
  );
}
