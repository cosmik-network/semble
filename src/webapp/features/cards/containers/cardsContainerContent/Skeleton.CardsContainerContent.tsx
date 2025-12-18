import { Stack, Grid, GridCol } from '@mantine/core';
import UrlCardSkeleton from '../../components/urlCard/Skeleton.UrlCard';

export default function CardsContainerContentSkeleton() {
  return (
    <Stack>
      <Grid gutter="xs">
        {Array.from({ length: 8 }).map((_, i) => (
          <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
            <UrlCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
