'use client';

import { useEffect, useRef } from 'react';
import { Container, Stack } from '@mantine/core';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '@/hooks/useAuth';
import { useNavHistory } from '@/providers/navHistory';
import { resolveEntrySource } from '@/features/analytics/pageVisit';
import { startExploreVisit } from '../../lib/analytics';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import ExploreCards from '../../components/exploreCards/ExploreCards';
import ExploreCollections from '../../components/exploreCollections/ExploreCollections';
import ExploreProfiles from '../../components/exploreProfiles/ExploreProfiles';
import ExploreFeeds from '../../components/exploreFeeds/ExploreFeeds';
import ExploreProfilesSkeleton from '../../components/exploreProfiles/Skeleton.ExploreProfiles';

export default function ExploreContainer() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { canGoBack } = useNavHistory();
  const startedRef = useRef(false);

  // Waits for auth so is_logged_in is accurate
  useEffect(() => {
    if (isAuthLoading || startedRef.current) return;
    startedRef.current = true;

    startExploreVisit({
      is_logged_in: isAuthenticated,
      // Nothing links here with a `ref`, so this tells in-app arrivals
      // (`other`) from direct loads (`external`)
      entry_source: resolveEntrySource(null, canGoBack),
    });
  }, [isAuthLoading, isAuthenticated, canGoBack]);

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
