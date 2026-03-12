import { Grid, GridCol } from '@mantine/core';
import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';

export default function SembleLibrariesContainerSkeleton() {
  return (
    <Grid gutter="xs">
      <GridCol
        span={{
          base: 12,
        }}
      >
        <ProfileCardSkeleton />
        <ProfileCardSkeleton />
        <ProfileCardSkeleton />
        <ProfileCardSkeleton />
      </GridCol>
    </Grid>
  );
}
