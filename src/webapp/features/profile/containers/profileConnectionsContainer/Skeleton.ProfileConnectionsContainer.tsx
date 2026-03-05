import {
  Container,
  Grid,
  GridCol,
  Group,
  Skeleton,
  Stack,
  Card,
} from '@mantine/core';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';

function ProfileConnectionItemSkeleton() {
  return (
    <Stack gap={'xs'}>
      {/* Source URL */}
      <UrlCardSkeleton />

      {/* Connection metadata */}
      <Card p={'xs'} radius={'md'}>
        <Group gap={'xs'}>
          <Skeleton height={20} width={20} circle />
          <Skeleton height={24} width={80} radius={'xl'} />
          <Skeleton height={20} width={60} />
        </Group>
      </Card>

      {/* Target URL */}
      <UrlCardSkeleton />
    </Stack>
  );
}

export default function ProfileConnectionsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'md'} align="center">
        <Group justify="flex-start" w={'100%'} maw={600}>
          <Skeleton w={96} h={40} radius={'md'} />
        </Group>

        <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
          {Array.from({ length: 3 }).map((_, i) => (
            <GridCol key={i} span={12}>
              <ProfileConnectionItemSkeleton />
            </GridCol>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
