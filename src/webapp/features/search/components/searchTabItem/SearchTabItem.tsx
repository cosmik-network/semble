'use client';

import { TabsTab } from '@mantine/core';
import { ReactNode } from 'react';
import styles from './SearchTabItem.module.css';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  icon: ReactNode;
  value: string;
  label: string;
}

export default function SearchTabItem(props: Props) {
  return (
    <TabsTab
      classNames={styles}
      value={props.value}
      leftSection={props.icon}
      onClick={() => {
        track(`Search: ${props.value} tab clicked`);
        posthog.capture(`Search: ${props.value} tab clicked`);
      }}
    >
      {props.label}
    </TabsTab>
  );
}
