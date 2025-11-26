import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import {
  Container,
  Grid,
  GridCol,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Title,
} from '@mantine/core';

export default function ProfileContainerSkeleton() {
  return (
    <Container p={'xs'} size={'xl'}>
      <Stack gap={50}>
        {/* Cards */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Cards
            </Title>
            <Skeleton w={87} h={36} radius={'xl'} />
          </Group>

          <Grid gutter="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
                <UrlCardSkeleton />
              </GridCol>
            ))}
          </Grid>
        </Stack>

        {/* Collections */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Collections
            </Title>

            <Skeleton w={87} h={36} radius={'xl'} />
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <CollectionCardSkeleton key={i} />
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
