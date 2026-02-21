import { Grid, GridCol } from '@mantine/core';
import SearchProfileCardSkeleton from '../../components/profileCard/Skeleton.SearchProfileCard';

export default function ProfileSearchResultsContainerSkeleton() {
  return (
    <Grid gutter="xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <GridCol key={i} span={12}>
          <SearchProfileCardSkeleton />
        </GridCol>
      ))}
    </Grid>
  );
}
