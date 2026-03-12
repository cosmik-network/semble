import { TabsTab } from '@mantine/core';
import classes from './TabItem.module.css';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  value: string;
  children: string;
  count?: number;
}

export default function TabItem(props: Props) {
  // Display count if provided and greater than 0
  const displayText =
    props.count && props.count > 0
      ? `${props.children} (${props.count})`
      : props.children;

  return (
    <TabsTab
      value={props.value}
      className={classes.tab}
      fw={600}
      onClick={() => {
        track(`Semble: ${props.value} tab`);
        posthog.capture(`Semble: ${props.value} tab`);
      }}
    >
      {displayText}
    </TabsTab>
  );
}
