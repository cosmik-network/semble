import { Card, Flex } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './StatChipCard.module.css';

interface Props {
  children: ReactNode;
}

export default function StatChipCard(props: Props) {
  return (
    <Card p={'xxs'} radius={'md'} className={classes.root}>
      <Flex wrap="wrap" align="center" columnGap="lg" rowGap="xs">
        {props.children}
      </Flex>
    </Card>
  );
}
