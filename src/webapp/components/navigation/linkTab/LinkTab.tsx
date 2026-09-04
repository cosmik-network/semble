'use client';

import { TabsTab } from '@mantine/core';
import Link from 'next/link';
import { ReactNode } from 'react';
import classes from './LinkTab.module.css';

interface Props {
  value: string;
  href: string;
  children: ReactNode;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  onClick?: () => void;
}

/** A tab that navigates like a link: prefetches, and opens in a new tab on middle-click. */
export default function LinkTab(props: Props) {
  return (
    <TabsTab
      value={props.value}
      className={classes.tab}
      leftSection={props.leftSection}
      rightSection={props.rightSection}
      onClick={props.onClick}
      renderRoot={(rootProps) => <Link href={props.href} {...rootProps} />}
    >
      {props.children}
    </TabsTab>
  );
}
