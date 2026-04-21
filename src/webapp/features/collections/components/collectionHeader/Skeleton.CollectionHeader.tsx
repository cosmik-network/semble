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
                <Group gap={'xs'}>
                  {/* "Collection" text */}
                  <Skeleton w={120} h={20} />

                  {/* Open badge (optional) */}
                  {/*<Skeleton w={67} h={20} />*/}
                </Group>

                {/* Title */}
                <Skeleton w={300} h={42} mt={8} />

                {/* Description */}
                {/*<Skeleton w={'100%'} color="grape" h={22} mt={'lg'} />*/}
              </Stack>
            </Group>

            <Group justify="space-between" gap={'lg'}>
              <Stack gap={'xs'}>
                {/* Author + collaborators */}
                <Group gap={5}>
                  <Skeleton w={180} h={24} />
                </Group>

                {/* Stats section */}
                <Skeleton w={'100%'} h={20} />
              </Stack>

              <CollectionActionsSkeleton />
            </Group>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
