import {
  Container,
  Grid,
  GridCol,
  Group,
  Skeleton,
  Stack,
} from '@mantine/core';
import ProfileConnectionItemSkeleton from '@/features/connections/components/profileConnectionItem/Skeleton.ProfileConnectionItem';

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
