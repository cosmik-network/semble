import { Box, Skeleton, Stack } from '@mantine/core';

const FIRST_PARAGRAPH = [100, 95, 88, 100, 92, 78, 100, 96, 83, 60];
const SECOND_PARAGRAPH = [100, 91, 100, 85, 100, 72];

export default function ReaderArticleSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={12} width="15%" radius="sm" />
      <Skeleton height={36} width="90%" radius="sm" />
      <Skeleton height={36} width="70%" radius="sm" />
      <Skeleton height={12} width="25%" radius="sm" mt={4} />
      <Box mt="xl">
        {FIRST_PARAGRAPH.map((width, i) => (
          <Skeleton
            key={i}
            height={14}
            width={`${width}%`}
            radius="sm"
            mb={10}
          />
        ))}
      </Box>
      <Box mt="xs">
        {SECOND_PARAGRAPH.map((width, i) => (
          <Skeleton
            key={i}
            height={14}
            width={`${width}%`}
            radius="sm"
            mb={10}
          />
        ))}
      </Box>
    </Stack>
  );
}
