'use client';

import {
  Container,
  SimpleGrid,
} from '@mantine/core';
import { Suspense } from 'react';
import GemsCollectionsContainerContent from '../gemsCollectionsContainerContent/GemsCollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';

export default function GemsCollectionsContainer() {
  return (
    <Container p="xs" size="xl">
      <Suspense fallback={<CollectionsContainerContentSkeleton />}>
        <GemsCollectionsContainerContent />
      </Suspense>
    </Container>
  );
}
