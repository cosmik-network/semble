import { Suspense } from 'react';
import { Box, LoadingOverlay } from '@mantine/core';
import UserGraphView from '@/features/graph/components/graphView/UserGraphView';

interface PageProps {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  return {
    title: `${handle}'s Graph | Semble`,
    description: `Visualize ${handle}'s knowledge graph`,
  };
}

export default async function UserGraphPage({ params }: PageProps) {
  const { handle } = await params;

  return (
    <Suspense
      fallback={
        <Box pos="relative" h="calc(100vh - 60px)" w="100%">
          <LoadingOverlay visible />
        </Box>
      }
    >
      <UserGraphView identifier={handle} />
    </Suspense>
  );
}
