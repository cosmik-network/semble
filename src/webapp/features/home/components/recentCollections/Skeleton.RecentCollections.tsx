import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import { Stack, Group, Title, Skeleton, SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';

export default function RecentCollectionsSkeleton() {
  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <BiCollection size={22} />
          <Title order={2}>Collections</Title>
        </Group>
        <Skeleton w={87} h={36} radius={'xl'} />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
