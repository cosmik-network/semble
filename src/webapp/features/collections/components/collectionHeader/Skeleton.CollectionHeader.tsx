import { Container, Group, Stack, Skeleton, Box } from '@mantine/core';
import CollectionActionsSkeleton from '../collectionActions/Skeleton.CollectionActions';
import CollectionStatsSkeleton from '../collectionStats/Skeleton.CollectionStats';

export default function CollectionHeaderSkeleton() {
  return (
    <>
      {/* Light mode gradient */}
      <Box
        lightHidden
        style={{
          width: '100%',
          height: '40px',
          background:
            'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-gray-8) 40%, transparent))',
          pointerEvents: 'none',
        }}
      />
      {/* Dark mode gradient */}
      <Box
        darkHidden
        style={{
          width: '100%',
          height: '40px',
          background:
            'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-gray-1) 40%, transparent))',
          pointerEvents: 'none',
        }}
      />
      <Container p="xs" size="xl">
        <Stack gap={'xs'}>
          <Group justify="space-between" align="flex-start" gap={'xs'}>
            <Stack gap={0}>
              {/* "Collection" text, and the Open badge on open collections */}
              <Group gap={'xs'} h={24.8}>
                <Skeleton w={120} h={18} />
              </Group>

              {/* Title */}
              <Group h={44.2}>
                <Skeleton w={300} h={34} />
              </Group>
            </Stack>

            {/* Author + updated */}
            <Group gap={'xs'} wrap="nowrap">
              <Skeleton w={32} h={32} radius="md" />
              <Stack gap={4}>
                <Skeleton w={140} h={14} />
                <Skeleton w={104} h={14} />
              </Stack>
            </Group>
          </Group>

          {/* Description — omitted: we can't know whether there is one */}
          <Group justify="space-between" gap={'lg'} mt={'sm'}>
            <Box style={{ visibility: 'hidden' }}>
              <CollectionStatsSkeleton />
            </Box>
            <CollectionActionsSkeleton />
          </Group>
        </Stack>
      </Container>
    </>
  );
}
