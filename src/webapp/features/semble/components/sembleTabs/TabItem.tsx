import { TabsTab } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './TabItem.module.css';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  value: string;
  children: string;
  rightSection?: ReactNode;
}

export default function TabItem(props: Props) {
  return (
    <TabsTab
      value={props.value}
      className={classes.tab}
      fw={600}
      rightSection={props.rightSection}
      onClick={() => {
        track(`Semble: ${props.value} tab`);
        posthog.capture(`Semble: ${props.value} tab`);
      }}
    >
      {props.children}
    </TabsTab>
  );
}
