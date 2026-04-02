import { Grid, GridCol, Stack } from '@mantine/core';
import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';

export default function SembleLibrariesContainerSkeleton() {
  return (
    <Stack gap={'xs'}>
      {Array.from({ length: 8 }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
