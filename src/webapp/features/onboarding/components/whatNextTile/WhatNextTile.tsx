'use client';

import {
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { IoChevronForward } from 'react-icons/io5';
import styles from './WhatNextTile.module.css';

interface Props {
  icon: React.ReactNode;
  /** Accent for this task's icon, so the three rows are told apart at a glance. */
  color: string;
  title: string;
  description: string;
  done?: boolean;
  onClick: () => void;
  /** Drives aria-expanded and the chevron. The panel is the caller's to
   * render: inside the tile it would stretch its neighbours to match. */
  expanded?: boolean;
}

export default function WhatNextTile(props: Props) {
  const body = (
    <Stack gap={'sm'} w={'100%'} h={'100%'} p={'md'}>
      <Group justify="space-between" wrap="nowrap">
        <ThemeIcon
          variant="light"
          color={props.color}
          size={38}
          // 50%, not radius="xl": at 38px `xl` is still visibly a rounded
          // square, and the disc has to match the round box beside it.
          radius={'50%'}
        >
          {props.icon}
        </ThemeIcon>

        <Group gap={6} wrap="nowrap">
          {/* A chevron on a tile that just opens a drawer would promise an
              expansion that never happens. */}
          {props.expanded !== undefined && (
            <ThemeIcon
              variant="transparent"
              color="gray"
              size={'sm'}
              className={styles.affordance}
              mod={{ expanded: props.expanded }}
            >
              <IoChevronForward size={16} />
            </ThemeIcon>
          )}

          {/* Checkbox.Indicator, not Checkbox: it draws the box and the tick
              with no input behind it. A real checkbox here would be a nested
              control promising a state you can set — you cannot. */}
          <Checkbox.Indicator
            checked={props.done}
            color="green"
            size={'md'}
            radius={'xl'}
            aria-hidden="true"
          />
        </Group>
      </Group>

      <Stack gap={2} miw={0}>
        <Group gap={6} wrap="nowrap">
          <Text fw={600} c={props.done ? 'dimmed' : 'bright'}>
            {props.title}
          </Text>
          {props.done && <VisuallyHidden>Done</VisuallyHidden>}
        </Group>
        <Text fz={'sm'} c={'dimmed'} lineClamp={2}>
          {props.description}
        </Text>
      </Stack>
    </Stack>
  );

  return (
    // The stylesheet's `overflow: hidden` is not optional: Paper sets a radius
    // without clipping to it, so the row's hover would paint a square corner.
    <Card
      withBorder
      radius={'lg'}
      p={0}
      h={'100%'}
      className={styles.card}
      // Marks which tile the panel below belongs to.
      mod={{ expanded: props.expanded }}
    >
      {/* The panel this opens renders outside the button — full of UrlCards
          with buttons of their own, so nested inside it a click would bubble up
          and collapse what it just opened. */}
      <UnstyledButton
        onClick={props.onClick}
        aria-expanded={props.expanded}
        w={'100%'}
        h={'100%'}
        className={styles.row}
        mod={{ done: props.done }}
      >
        {body}
      </UnstyledButton>
    </Card>
  );
}
