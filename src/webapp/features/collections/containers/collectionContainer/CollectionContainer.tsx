import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack gap="lg">
        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
