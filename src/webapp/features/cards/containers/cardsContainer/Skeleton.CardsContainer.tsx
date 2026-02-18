import {
  Container,
  Grid,
  GridCol,
  Group,
  Select,
  Skeleton,
  Stack,
} from '@mantine/core';
import UrlCardSkeleton from '../../components/urlCard/Skeleton.UrlCard';

export default function CardsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group gap={'xs'} justify="space-between">
          <Skeleton w={96} h={36} radius={'xl'} />
          <Skeleton w={100} h={36} radius={'xl'} />
        </Group>

        <Grid gutter="xs">
          {Array.from({ length: 8 }).map((_, i) => (
            <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
              <UrlCardSkeleton />
            </GridCol>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
