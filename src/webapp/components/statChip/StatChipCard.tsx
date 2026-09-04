import { Card, Flex } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './StatChipCard.module.css';

interface Props {
  children: ReactNode;
  grow?: boolean;
}

export default function StatChipCard(props: Props) {
  return (
    <Card
      p={'xxs'}
      radius={'md'}
      className={classes.root}
      mod={{ grow: props.grow }}
    >
      <Flex
        wrap="wrap"
        align="center"
        columnGap="xxs"
        rowGap="xxs"
        className={classes.chips}
      >
        {props.children}
      </Flex>
    </Card>
  );
}
