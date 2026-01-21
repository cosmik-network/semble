import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Grid, GridCol } from '@mantine/core';

export default function CardSearchResultsContainerSkeleton() {
  return (
    <Grid gutter="xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <GridCol key={i} span={12}>
          <UrlCardSkeleton />
        </GridCol>
      ))}
    </Grid>
  );
}
