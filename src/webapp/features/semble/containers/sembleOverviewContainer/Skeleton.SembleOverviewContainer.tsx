import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import NoteCardSkeleton from '@/features/notes/components/noteCard/Skeleton.NoteCard';
import {
  Grid,
  GridCol,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Title,
} from '@mantine/core';
import AddedByCardSkeleton from '../../components/addedByCard/Skeleton.AddedByCard';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';

export default function SembleOverviewContainerSkeleton() {
  return (
    <Stack>
      <Stack gap={50}>
        {/* Notes */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Notes
            </Title>
            <Skeleton w={87} h={36} radius={'xl'} />
          </Group>

          <Grid gutter="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
                <NoteCardSkeleton />
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

        {/* Libraries */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Added by
            </Title>
            <Skeleton w={87} h={36} radius={'xl'} />
          </Group>

          <Grid gutter="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <GridCol
                key={i}
                span={{
                  base: 12,
                  xs: 6,
                  sm: 4,
                }}
              >
                <AddedByCardSkeleton />
              </GridCol>
            ))}
          </Grid>
        </Stack>

        {/* Similar cards */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Similar cards
            </Title>
            <Skeleton w={87} h={36} radius={'xl'} />
          </Group>

          <Grid gutter="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <GridCol
                key={i}
                span={{
                  base: 12,
                  xs: 6,
                  sm: 4,
                }}
              >
                <UrlCardSkeleton />
              </GridCol>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Stack>
  );
}
