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
          <Select disabled mr={'auto'} variant="filled" size="sm" />
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

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
