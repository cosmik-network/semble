'use client';

import type { ReactNode } from 'react';
import { Card, Group, Stack, Text, Title } from '@mantine/core';
import styles from './TaskPanel.module.css';

/**
 * The panel's fill, for anything inside that has to paint the same colour —
 * `Scroller`'s edge fade defaults to the page colour instead.
 */
export const PANEL_FILL =
  'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))';

interface Props {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

export default function TaskPanel(props: Props) {
  return (
    <Card withBorder radius={'lg'} p={'md'} className={styles.panel}>
      <Stack gap={'md'}>
        <Stack gap={2}>
          <Title order={3} fz={'md'} fw={600}>
            {props.title}
          </Title>
          <Text fz={'sm'} c={'dimmed'}>
            {props.subtitle}
          </Text>
        </Stack>

        {props.children}
      </Stack>
    </Card>
  );
}
