'use client';

import { Tabs } from '@mantine/core';
import classes from './TabItem.module.css';
import { useRouter } from 'next/navigation';

interface Props {
  value: string;
  href: string;
  children: string;
}

export default function TabItem(props: Props) {
  const router = useRouter();

  return (
    <Tabs.Tab
      value={props.value}
      className={classes.tab}
      fw={600}
      onClick={() => router.push(props.href)}
    >
      {props.children}
    </Tabs.Tab>
  );
}
