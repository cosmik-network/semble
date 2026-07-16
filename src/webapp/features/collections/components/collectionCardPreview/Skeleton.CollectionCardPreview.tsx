import { AspectRatio, Box, Group, Skeleton, Stack } from '@mantine/core';

const CARD_WIDTH = 110;

export default function CollectionCardPreviewSkeleton() {
  return (
    <Box
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <Group gap={'xs'} grow wrap="nowrap" align="start">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} w={CARD_WIDTH} miw={CARD_WIDTH}>
            <AspectRatio ratio={16 / 9}>
              <Skeleton radius={'md'} />
            </AspectRatio>
            <Stack gap={4} mt={6}>
              <Skeleton height={9} width={'55%'} radius={'sm'} />
              <Skeleton height={9} width={'90%'} radius={'sm'} />
            </Stack>
          </Box>
        ))}
      </Group>
    </Box>
  );
}
