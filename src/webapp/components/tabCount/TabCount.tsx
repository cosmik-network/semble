'use client';

import { Badge, Skeleton } from '@mantine/core';
import classes from './TabCount.module.css';
import { abbreviateNumber } from '@/lib/utils/text';

interface Props {
  /** number → render it (0 included) · undefined → still loading · null → unavailable */
  count: number | null | undefined;
}

export default function TabCount(props: Props) {
  if (props.count === null) {
    return null;
  }

  if (props.count === undefined) {
    return <Skeleton className={classes.count} radius="xl" />;
  }

  return (
    <Badge variant="light" color="gray" fullWidth className={classes.count}>
      {abbreviateNumber(props.count)}
    </Badge>
  );
}
