import { Grid, GridCol } from '@mantine/core';
import ProfileCardSkeleton from '../../components/profileCard/Skeleton.ProfileCard';

export default function ProfileSearchResultsContainerSkeleton() {
  return (
    <Grid gutter="xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <GridCol key={i} span={12}>
          <ProfileCardSkeleton />
        </GridCol>
      ))}
    </Grid>
  );
}
