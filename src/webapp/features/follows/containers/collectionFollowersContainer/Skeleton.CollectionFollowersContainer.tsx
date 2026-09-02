import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';
import { Stack } from '@mantine/core';

export default function CollectionFollowersContainerSkeleton() {
  return (
    <Stack gap={'xs'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
