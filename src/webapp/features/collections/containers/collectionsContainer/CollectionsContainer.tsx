import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';

interface Props {
  handle: string;
}

export default function CollectionsContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Suspense fallback={<CollectionsContainerContentSkeleton />}>
          <CollectionsContainerContent handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
