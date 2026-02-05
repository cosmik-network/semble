import { Container, Group, Skeleton, Stack, Text } from '@mantine/core';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';

export default function CollectionContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack justify="flex-start">
        <Group justify="space-between" align="start">
          <Stack gap={'xs'}>
            <Group gap={'xs'}>
              <Text fw={700} c="grape">
                Collection
              </Text>

              {/* Open collection badge */}
              <Skeleton w={67} h={20} />
            </Group>

            {/* Title */}
            <Skeleton w={300} h={27} />

            {/* Description */}
            {/*<Skeleton w={'80%'} h={22} mt={'lg'} />*/}
          </Stack>

          <Stack>
            {/* By */}
            <Skeleton w={100} h={24} />
          </Stack>
        </Group>

        <Group justify="space-between" align="end" gap={'xs'}>
          <Group gap={'xs'} justify="space-between">
            <Skeleton w={96} h={36} radius={'xl'} />
          </Group>
          {/* Actions */}
          <Group gap={'xs'}>
            <Skeleton w={124} h={32} radius={'xl'} />
            <Skeleton w={32} h={32} radius={'xl'} />
            <Skeleton w={32} h={32} radius={'xl'} />
          </Group>
        </Group>

        {/* Cards */}
        <CollectionContainerContentSkeleton />
      </Stack>
    </Container>
  );
}
