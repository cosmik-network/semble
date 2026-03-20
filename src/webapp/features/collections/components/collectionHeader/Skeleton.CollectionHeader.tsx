import { Container, Group, Stack, Skeleton, Box } from '@mantine/core';

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
            'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-gray-8))',
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
            'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-gray-1))',
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
                  <Skeleton w={74} h={20} />

                  {/* Open badge (optional) */}
                  <Skeleton w={67} h={20} />
                </Group>

                {/* Title */}
                <Skeleton w={300} h={42} mt={8} />

                {/* Description */}
                {/*<Skeleton w={'100%'} color="grape" h={22} mt={'lg'} />*/}
              </Stack>
            </Group>

            <Group justify="space-between" gap={'lg'}>
              <Stack gap={'xs'}>
                {/* "By" section */}
                <Group gap={5}>
                  <Skeleton w={180} h={24} />
                </Group>

                {/* Stats section */}
                <Skeleton w={'100%'} h={20} />
              </Stack>

              {/* Actions */}
              <Group gap={'xs'}>
                <Skeleton w={124} h={36} radius={'xl'} />
                <Skeleton w={34} h={34} radius={'xl'} />
                <Skeleton w={34} h={34} radius={'xl'} />
              </Group>
            </Group>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
