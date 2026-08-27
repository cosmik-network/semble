'use client';

import { Container, Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import ExploreCards from '../../components/exploreCards/ExploreCards';
import ExploreCollections from '../../components/exploreCollections/ExploreCollections';
import ExploreProfiles from '../../components/exploreProfiles/ExploreProfiles';
import ExploreFeeds from '../../components/exploreFeeds/ExploreFeeds';
import ExploreProfilesSkeleton from '../../components/exploreProfiles/Skeleton.ExploreProfiles';

export default function ExploreContainer() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  return (
    <Container p="xs" size="xl">
      <Stack gap={80}>
        <ExploreCards />
        <ExploreCollections />
        {isAuthLoading ? (
          <ExploreProfilesSkeleton />
        ) : (
          isAuthenticated && <ExploreProfiles />
        )}
        <ExploreFeeds />
      </Stack>
    </Container>
  );
}
