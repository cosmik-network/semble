import { Container, Stack } from '@mantine/core';
import ProfileCardSkeleton from '@/features/profile/components/profileCard/Skeleton.ProfileCard';

export default function CollectionContributorsContainerSkeleton() {
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
