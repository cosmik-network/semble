import {
  Container,
  Group,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';
import { IoSearch } from 'react-icons/io5';

export default function CollectionsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap={'xs'}>
          <Select disabled w={140} mr={'auto'} variant="filled" size="sm" />
          <Skeleton w={90} h={36} radius={'xl'} />
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
