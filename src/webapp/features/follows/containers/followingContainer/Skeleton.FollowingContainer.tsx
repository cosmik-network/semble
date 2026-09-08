import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';
import { Stack } from '@mantine/core';

export default function FollowingContainerSkeleton() {
  return (
    <Stack gap={'xs'}>
      {Array.from({ length: 8 }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
