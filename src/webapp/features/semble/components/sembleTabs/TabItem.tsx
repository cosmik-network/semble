import { Badge, TabsTab } from '@mantine/core';
import classes from './TabItem.module.css';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';
import { abbreviateNumber } from '@/lib/utils/text';

interface Props {
  value: string;
  children: string;
  count?: number;
}

export default function TabItem(props: Props) {
  return (
    <TabsTab
      value={props.value}
      className={classes.tab}
      fw={600}
      rightSection={
        props.count && props.count > 0 ? (
          <Badge variant="light" color="gray" fullWidth>
            {abbreviateNumber(props.count)}
          </Badge>
        ) : undefined
      }
      onClick={() => {
        track(`Semble: ${props.value} tab`);
        posthog.capture(`Semble: ${props.value} tab`);
      }}
    >
      {props.children}
    </TabsTab>
  );
}
