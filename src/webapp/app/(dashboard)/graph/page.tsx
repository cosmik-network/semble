import { Suspense } from 'react';
import { Box, LoadingOverlay } from '@mantine/core';
import GraphView from '@/features/graph/components/graphView/GraphView';

export const metadata = {
  title: 'Graph View | Semble',
  description: 'Visualize your knowledge graph',
};

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <Box pos="relative" h="calc(100vh - 60px)" w="100%">
          <LoadingOverlay visible />
        </Box>
      }
    >
      <GraphView />
    </Suspense>
  );
}
