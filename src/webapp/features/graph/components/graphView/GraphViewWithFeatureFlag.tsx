'use client';

import { Box, LoadingOverlay, Stack, Text, Title } from '@mantine/core';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import GraphView from './GraphView';

/**
 * Wrapper component that checks the graphView feature flag
 * before rendering the GraphView component
 */
export default function GraphViewWithFeatureFlag() {
  const { data: featureFlags, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <Box pos="relative" h="calc(100vh - 60px)" w="100%">
        <LoadingOverlay visible />
      </Box>
    );
  }

  if (!featureFlags?.graphView) {
    return (
      <Box
        pos="relative"
        h="calc(100vh - 60px)"
        w="100%"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Stack align="center" gap="md">
          <Title order={2}>Graph View</Title>
          <Text c="dimmed" size="lg" ta="center">
            This feature is currently in beta and not available to all users.
          </Text>
        </Stack>
      </Box>
    );
  }

  return <GraphView />;
}
