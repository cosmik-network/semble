import { Box, LoadingOverlay } from '@mantine/core';

export default function GraphLoading() {
  return (
    <Box pos="relative" h="calc(100vh - 60px)" w="100%">
      <LoadingOverlay visible />
    </Box>
  );
}
