import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import { Grid, GridCol } from '@mantine/core';

export default function CollectionSearchResultsContainerSkeleton() {
  return (
    <Grid gutter="xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <GridCol key={i} span={12}>
          <CollectionCardSkeleton />
        </GridCol>
      ))}
    </Grid>
  );
}
