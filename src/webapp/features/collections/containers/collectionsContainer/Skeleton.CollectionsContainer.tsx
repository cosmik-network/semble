import {
  CloseButton,
  Container,
  Group,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';
import { IoSearch } from 'react-icons/io5';

export default function CollectionsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group align="end" gap={'xs'}>
          <Select disabled mr={'auto'} size="sm" label="Sort by" />
          <TextInput
            placeholder={'Search for collections'}
            leftSection={<IoSearch />}
            rightSection={
              <CloseButton
                aria-label="Clear input"
                style={{ display: 'none' }}
              />
            }
            size="sm"
          />
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
