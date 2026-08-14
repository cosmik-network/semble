'use client';

import type { ReactNode } from 'react';
import { Box, Group, Image, Stack, Text } from '@mantine/core';
import { LinkCard } from '@/components/link/MantineLink';
import styles from './OptionTile.module.css';

export const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

export const OPTION_TILE_PROPS = {
  withBorder: true,
  radius: 'lg',
  p: 'md',
  h: '100%',
  className: styles.tile,
} as const;

const MARK_SIZE = 24;

export function brandMark(src: string, size = MARK_SIZE) {
  return <Image src={src} alt="" w={size} h={size} fit="contain" />;
}

const MARK_COLOR = 'green.6';

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

export function OptionTileBody(props: BodyProps) {
  return (
    <Group wrap="nowrap" align="center" gap={'sm'}>
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
