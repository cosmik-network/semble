import { Card, Flex } from '@mantine/core';
import CollectionStatChipSkeleton from './Skeleton.CollectionStatChip';
import classes from './CollectionStats.module.css';

export default function CollectionStatsSkeleton() {
  return (
    <Card p={'xxs'} radius={'md'} className={classes.root}>
      <Flex wrap="wrap" align="center" columnGap="lg" rowGap="xs">
        <CollectionStatChipSkeleton width={90} />
        <CollectionStatChipSkeleton width={84} />
      </Flex>
    </Card>
  );
}
