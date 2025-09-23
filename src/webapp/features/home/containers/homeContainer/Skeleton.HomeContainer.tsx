import {
  Anchor,
  Container,
  Grid,
  GridCol,
  Group,
  SimpleGrid,
  Stack,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';

export default function HomeContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap="xl">
        <Title order={1}>Home</Title>

        <Stack gap={50}>
          {/* Collections */}
          <Stack>
            <Group justify="space-between">
              <Group gap="xs">
                <BiCollection size={22} />
                <Title order={2}>Collections</Title>
              </Group>
              <Anchor component={Link} href="/collections" c="blue" fw={600}>
                View all
              </Anchor>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {Array.from({ length: 4 }).map((_, i) => (
                <CollectionCardSkeleton key={i} />
              ))}
            </SimpleGrid>
          </Stack>

          {/* Cards */}
          <Stack>
            <Group justify="space-between">
              <Group gap="xs">
                <FaRegNoteSticky size={22} />
                <Title order={2}>My Cards</Title>
              </Group>
              <Anchor component={Link} href="/my-cards" c="blue" fw={600}>
                View all
              </Anchor>
            </Group>

            <Grid gutter="md">
              {Array.from({ length: 4 }).map((_, i) => (
                <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
                  <UrlCardSkeleton />
                </GridCol>
              ))}
            </Grid>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
