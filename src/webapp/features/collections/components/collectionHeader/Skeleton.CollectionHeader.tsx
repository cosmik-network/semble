import { Container, Group, Stack, Skeleton, Box } from '@mantine/core';
import CollectionActionsSkeleton from '../collectionActions/Skeleton.CollectionActions';

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
        <Stack gap={'lg'}>
          <Stack gap={'xs'}>
            <Group justify="space-between" align="start">
              <Stack gap={0}>
                {/* "Collection" text, and the Open badge on open collections */}
                <Group gap={'xs'} h={24.8}>
                  <Skeleton w={120} h={18} />
                </Group>

                {/* Title */}
                <Group h={44.2}>
                  <Skeleton w={300} h={34} />
                </Group>

                {/* Description — omitted: we can't know whether there is one */}
              </Stack>
            </Group>

            <Group justify="space-between" gap={'lg'}>
              <Stack gap={'xs'}>
                {/* Author + collaborators */}
                <Group gap={5} h={26}>
                  <Skeleton w={180} h={22} />
                </Group>

                {/* Stats section */}
                <Group h={21.7}>
                  <Skeleton w={340} h={16} />
                </Group>
              </Stack>

              <CollectionActionsSkeleton />
            </Group>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
