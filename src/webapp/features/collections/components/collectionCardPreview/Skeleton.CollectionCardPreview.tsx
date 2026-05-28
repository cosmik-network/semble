import { AspectRatio, Box, Group, Skeleton } from '@mantine/core';

const CARD_WIDTH = 120;

export default function CollectionCardPreviewSkeleton() {
  return (
    <Box
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <Group gap={'xs'} grow wrap="nowrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} w={CARD_WIDTH} miw={CARD_WIDTH}>
            <AspectRatio ratio={16 / 9}>
              <Skeleton radius={'md'} />
            </AspectRatio>
          </Box>
        ))}
      </Group>
    </Box>
  );
}
