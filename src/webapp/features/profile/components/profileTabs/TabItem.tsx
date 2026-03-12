'use client';

import { Badge, Tabs } from '@mantine/core';
import classes from './TabItem.module.css';
import { useRouter } from 'next/navigation';

interface Props {
  value: string;
  href: string;
  children: string;
  count?: number;
}

export default function TabItem(props: Props) {
  const router = useRouter();

  return (
    <Tabs.Tab
      value={props.value}
      className={classes.tab}
      fw={600}
      rightSection={
        props.count && props.count > 0 ? (
          <Badge variant="light" color="gray" fullWidth>
            {props.count > 99 ? '99+' : props.count}
          </Badge>
        ) : undefined
      }
      onClick={() => router.push(props.href)}
    >
      {props.children}
    </Tabs.Tab>
  );
}
