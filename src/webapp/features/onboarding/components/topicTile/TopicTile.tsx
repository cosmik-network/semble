'use client';

import { Card, Group, Text, ThemeIcon } from '@mantine/core';
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
    // A toggle button rather than a Chip: a chip grows when its checkmark
    // appears and shunts every chip after it onto a different line, where this
    // is the same size picked or not.
    <Card
      component="button"
      aria-pressed={props.selected}
      onClick={props.onToggle}
      withBorder
      radius={'xl'}
      padding={0}
      className={styles.tile}
      // A solid tint, not Mantine's `-light` shade: those are colour-mixed
      // with transparency, and over the page artwork the fill washes out. The
      // palette's own 0 and 9 are opaque at both ends.
      bg={
        props.selected
          ? `light-dark(var(--mantine-color-${TOPIC_COLOR}-0), var(--mantine-color-${TOPIC_COLOR}-9))`
          : undefined
      }
      style={{
        borderColor: props.selected
          ? `var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
      }}
    >
      <Group gap={8} wrap="nowrap" px={10} py={6}>
        <ThemeIcon
          variant={props.selected ? 'filled' : 'light'}
          color={props.selected ? TOPIC_COLOR : 'gray'}
          size={24}
          radius={'xl'}
        >
          <Icon size={14} />
        </ThemeIcon>

        {/* A span, not Text's default <p> — this sits inside a <button>. */}
        <Text component="span" fz={'sm'} fw={600} c={'bright'} lh={1.2}>
          {props.label}
        </Text>
      </Group>
    </Card>
  );
}
