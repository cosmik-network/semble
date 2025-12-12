'use client';

import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import GemsCollectionsContainerContent from '../gemsCollectionsContainerContent/GemsCollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';
import GemsOfYearBanner from '../../components/gemsOfYearBanner/GemsOfYearBanner';
import GemsOf2025 from '@/features/home/components/gemsOf2025/GemsOf2025';

export default function GemsCollectionsContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'xl'}>
        <GemsOf2025 />
        <GemsOfYearBanner />
        <Suspense fallback={<CollectionsContainerContentSkeleton />}>
          <GemsCollectionsContainerContent />
        </Suspense>
      </Stack>
    </Container>
  );
}
