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
  subtitle: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export default function TaskPanel(props: Props) {
  return (
    <Card withBorder radius={'lg'} p={'md'} className={styles.panel}>
      <Stack gap={'md'}>
        <Group
          justify="space-between"
          align="flex-start"
          wrap="wrap"
          gap={'sm'}
        >
          <Stack gap={2}>
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
