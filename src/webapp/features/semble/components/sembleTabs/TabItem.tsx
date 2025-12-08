import { TabsTab } from '@mantine/core';
import classes from './TabItem.module.css';
import { track } from '@vercel/analytics';

interface Props {
  value: string;
  children: string;
}

export default function TabItem(props: Props) {
  return (
    <TabsTab
      value={props.value}
      className={classes.tab}
      fw={600}
      onClick={() => {
        track(`Semble: ${props.value} tab`);
      }}
    >
      {props.children}
    </TabsTab>
  );
}
