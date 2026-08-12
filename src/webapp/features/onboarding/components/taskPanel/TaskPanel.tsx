'use client';

import type { ReactNode } from 'react';
import { Card, Group, Stack, Text, Title } from '@mantine/core';
import styles from './TaskPanel.module.css';

/**
 * The panel's fill, for anything inside that has to paint the same colour —
 * `Scroller`'s edge fade defaults to the page colour. Kept beside the class
 * that applies it so the two cannot drift.
 */
export const PANEL_FILL =
  'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))';

interface Props {
  title: string;
  /** A node, not a string: the save panel carries a link inside its sentence. */
  subtitle: ReactNode;
  /** Ranged right against the title. */
  action?: ReactNode;
  children: ReactNode;
}

/** The shell both task panels open into. */
export default function TaskPanel(props: Props) {
  return (
    <Card withBorder radius={'lg'} p={'md'} className={styles.panel}>
      <Stack gap={'md'}>
        {/* Wrapping, so a narrow screen drops the action to its own line. */}
        <Group
          justify="space-between"
          align="flex-start"
          wrap="wrap"
          gap={'sm'}
        >
          <Stack gap={2}>
            {/* order 3 — the section heading above this is order 2. */}
            <Title order={3} fz={'md'} fw={600}>
              {props.title}
            </Title>
            <Text fz={'sm'} c={'dimmed'}>
              {props.subtitle}
            </Text>
          </Stack>

          {props.action}
        </Group>

        {props.children}
      </Stack>
    </Card>
  );
}
