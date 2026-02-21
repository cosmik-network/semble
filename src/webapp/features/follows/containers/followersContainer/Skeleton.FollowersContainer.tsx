import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';
import { Container, Stack } from '@mantine/core';

export default function FollowersContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'xs'}>
        {Array.from({ length: 8 }).map((_, i) => (
          <ProfileCardSkeleton key={i} />
        ))}
      </Stack>
    </Container>
  );
}
