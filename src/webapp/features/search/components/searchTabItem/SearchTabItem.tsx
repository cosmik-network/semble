'use client';

import { TabsTab } from '@mantine/core';
import { ReactNode } from 'react';
import Link from 'next/link';
import styles from './SearchTabItem.module.css';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  icon: ReactNode;
  value: string;
  label: string;
  href: string;
}

export default function SearchTabItem(props: Props) {
  return (
    <TabsTab
      // TabsTab isn't generically polymorphic, so render its root as a Link
      // via renderRoot to get a real href (middle-click, open in new tab).
      renderRoot={(rootProps) => <Link href={props.href} {...rootProps} />}
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
