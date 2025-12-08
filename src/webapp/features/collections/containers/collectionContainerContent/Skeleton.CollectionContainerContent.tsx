import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Grid, GridCol } from '@mantine/core';

export default function CollectionContainerContentSkeleton() {
  return (
    <Grid gutter="md">
      {Array.from({ length: 8 }).map((_, i) => (
        <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
          <UrlCardSkeleton />
        </GridCol>
      ))}
    </Grid>
  );
}
