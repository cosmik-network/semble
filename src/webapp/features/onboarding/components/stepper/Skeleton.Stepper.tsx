import { Box, Group, Skeleton } from '@mantine/core';
import { TOTAL_STEPS } from '../../lib/steps';

export default function StepperSkeleton() {
  return (
    <Group gap={6} wrap="nowrap" aria-hidden style={{ flex: '0 0 auto' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <Box key={index} py={8}>
          <Skeleton h={8} w={8} radius={'xl'} />
        </Box>
      ))}
    </Group>
  );
}
