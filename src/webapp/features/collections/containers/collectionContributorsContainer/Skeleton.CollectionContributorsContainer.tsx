import { Stack } from '@mantine/core';
import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';

export default function CollectionContributorsContainerSkeleton() {
  return (
    <Stack gap={'xs'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
