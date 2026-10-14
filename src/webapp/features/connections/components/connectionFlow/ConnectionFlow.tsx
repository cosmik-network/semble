import { Stack, ThemeIcon } from '@mantine/core';
import { BiSolidChevronDown } from 'react-icons/bi';
import type { ReactNode } from 'react';
import classes from './ConnectionFlow.module.css';

interface Props {
  /** The relation selector the streak passes behind. */
  children: ReactNode;
}

export default function ConnectionFlow(props: Props) {
  return (
    <>
      <div className={classes.segment} data-position="before" />

      {props.children}

      <Stack align="center" gap={0}>
        <div className={classes.segment} data-position="after" />

        <ThemeIcon size={'xs'} radius={'xl'} className={classes.arrival}>
          <BiSolidChevronDown size={12} />
        </ThemeIcon>
      </Stack>
    </>
  );
}
