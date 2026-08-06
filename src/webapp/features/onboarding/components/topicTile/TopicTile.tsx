'use client';

import { Card, Stack, Text, ThemeIcon } from '@mantine/core';
import type { IconType } from 'react-icons/lib';
import { TOPIC_COLOR } from './topicVisuals';
import styles from './TopicTile.module.css';

interface Props {
  label: string;
  icon: IconType;
  selected: boolean;
  onToggle: () => void;
}

export default function TopicTile(props: Props) {
  const Icon = props.icon;

  return (
    // A toggle button rather than a Chip: a tile in a grid cell is the same
    // size picked or not, whereas a chip grows when its checkmark appears and
    // shunts every chip after it onto a different line.
    <Card
      component="button"
      type="button"
      aria-pressed={props.selected}
      onClick={props.onToggle}
      withBorder
      radius={'lg'}
      padding={'md'}
      // Sized for the longest label at the narrowest column — "Personal
      // knowledge management" runs to three lines — so every tile matches and
      // no row stands taller than the one above it. Re-check this if a longer
      // topic is added to the registry.
      mih={120}
      ta="center"
      className={styles.tile}
      bg={
        props.selected ? `var(--mantine-color-${TOPIC_COLOR}-light)` : undefined
      }
      style={{
        borderColor: props.selected
          ? `var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
      }}
    >
      {/* Card's root is a flex column, so growing to fill it and centring
          along both axes puts the icon and label in the middle of the tile
          whatever height the row settles at. */}
      <Stack gap={'xs'} align="center" justify="center" flex={1}>
        {/* Gray at rest, the accent only once picked — so the grid is neutral
            until you choose and the colour is the reward, not the default. */}
        <ThemeIcon
          variant={props.selected ? 'filled' : 'light'}
          color={props.selected ? TOPIC_COLOR : 'gray'}
          size={'lg'}
          radius={'xl'}
        >
          <Icon size={18} />
        </ThemeIcon>

        {/* A span, not Text's default <p> — this sits inside a <button>. */}
        <Text component="span" fz={'sm'} fw={600} c={'bright'} lh={1.2}>
          {props.label}
        </Text>
      </Stack>
    </Card>
  );
}
