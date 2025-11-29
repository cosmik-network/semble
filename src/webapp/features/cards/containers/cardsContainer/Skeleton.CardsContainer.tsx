import { Container, Grid, GridCol, Select, Stack } from '@mantine/core';
import UrlCardSkeleton from '../../components/urlCard/Skeleton.UrlCard';

export default function CardsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Select disabled mr={'auto'} size="sm" label="Sort by" />

        <Grid gutter="md">
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
