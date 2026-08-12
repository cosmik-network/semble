'use client';

import type { ReactNode } from 'react';
import { Box, Group, Image, Stack, Text } from '@mantine/core';
import { LinkCard } from '@/components/link/MantineLink';
import styles from './OptionTile.module.css';

export const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

/**
 * A props object rather than something baked into the component below, for the
 * extension tile — it is a Menu.Target, not a link.
 */
export const OPTION_TILE_PROPS = {
  withBorder: true,
  radius: 'lg',
  p: 'md',
  h: '100%',
  className: styles.tile,
} as const;

const MARK_SIZE = 24;

/** `alt=""`: the title beside it already names the thing. */
export function brandMark(src: string, size = MARK_SIZE) {
  return <Image src={src} alt="" w={size} h={size} fit="contain" />;
}

const MARK_COLOR = 'green.6';

/**
 * Nothing is passed down to the icon itself: react-icons default to `1em` and
 * `currentColor`, so the size and colour set here reach any of them.
 */
export function iconMark(icon: ReactNode) {
  return (
    <Box c={MARK_COLOR} fz={MARK_SIZE} lh={1} display="flex">
      {icon}
    </Box>
  );
}

interface BodyProps {
  mark: ReactNode;
  title: string;
  description: string;
}

/** The inside of a tile on its own, for the extension card's menu trigger. */
export function OptionTileBody(props: BodyProps) {
  return (
    <Group wrap="nowrap" align="center" gap={'sm'}>
      {/* Group would otherwise let a fixed-size mark shrink to fit a long
          title. */}
      <Box style={{ flex: '0 0 auto' }}>{props.mark}</Box>

      <Stack gap={2} miw={0}>
        <Text fw={600} c={'bright'}>
          {props.title}
        </Text>
        <Text fz={'sm'} c={'dimmed'}>
          {props.description}
        </Text>
      </Stack>
    </Group>
  );
}

interface Props extends BodyProps {
  href: string;
  /** Anything that lives outside the app: stores, docs. Opens in a new tab. */
  external?: boolean;
  onClick?: () => void;
}

export default function OptionTile(props: Props) {
  return (
    <LinkCard
      href={props.href}
      {...(props.external && EXTERNAL_LINK_PROPS)}
      onClick={props.onClick}
      {...OPTION_TILE_PROPS}
    >
      <OptionTileBody
        mark={props.mark}
        title={props.title}
        description={props.description}
      />
    </LinkCard>
  );
}
