'use client';

import { Container, Stack } from '@mantine/core';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
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
        <ErrorBoundary fallback={<ErrorState message="Could not load cards" />}>
          <ExploreCards />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<ErrorState message="Could not load collections" />}
        >
          <ExploreCollections />
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<ErrorState message="Could not load profiles" />}
        >
          {isAuthLoading ? (
            <ExploreProfilesSkeleton />
          ) : (
            isAuthenticated && <ExploreProfiles />
          )}
        </ErrorBoundary>

        <ErrorBoundary fallback={<ErrorState message="Could not load feeds" />}>
          <ExploreFeeds />
        </ErrorBoundary>
      </Stack>
    </Container>
  );
}
