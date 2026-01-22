'use client';

import { TabsTab } from '@mantine/core';
import { ReactNode } from 'react';
import styles from './SearchTabItem.module.css';
import { useRouter } from 'next/navigation';

interface Props {
  icon: ReactNode;
  value: string;
  label: string;
  href: string;
}

export default function SearchTabItem(props: Props) {
  const router = useRouter();

  return (
    <TabsTab
      classNames={styles}
      value={props.value}
      leftSection={props.icon}
      onClick={() => router.push(props.href)}
    >
      {props.label}
    </TabsTab>
  );
}
