import { Tabs } from '@mantine/core';
import classes from './TabItem.module.css';

interface Props {
  value: string;
  children: string;
}

export default function TabItem(props: Props) {
  return (
    <Tabs.Tab c={'dark'} value={props.value} className={classes.tab} fw={600}>
      {props.children}
    </Tabs.Tab>
  );
}
