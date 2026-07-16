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
            {/* Mirrors the loaded card: a short domain line + a 2-line title */}
            <Stack gap={5} mt={6}>
              <Skeleton height={8} width={'45%'} radius={'sm'} />
              <Skeleton height={10} width={'90%'} radius={'sm'} />
              <Skeleton height={10} width={'65%'} radius={'sm'} />
            </Stack>
          </Box>
        ))}
      </Group>
    </Box>
  );
}
