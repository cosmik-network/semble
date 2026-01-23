'use client';

import { TabsTab } from '@mantine/core';
import { ReactNode } from 'react';
import styles from './SearchTabItem.module.css';

interface Props {
  icon: ReactNode;
  value: string;
  label: string;
}

export default function SearchTabItem(props: Props) {
  return (
    <TabsTab classNames={styles} value={props.value} leftSection={props.icon}>
      {props.label}
    </TabsTab>
  );
}
