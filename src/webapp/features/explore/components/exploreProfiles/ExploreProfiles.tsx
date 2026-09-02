'use client';

import { SegmentedControl } from '@mantine/core';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import { ProfilesView, profileViewOptions } from '../../lib/profilesView';
import useExploreSeedUrls from '../../lib/queries/useExploreSeedUrls';
import { ExploreProfilesListSkeleton } from './Skeleton.ExploreProfiles';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import ProfileSuggestionList from '@/features/profile/components/profileSuggestionList/ProfileSuggestionList';
import RecommendedProfiles from './RecommendedProfiles';
import BlueskyProfiles from './BlueskyProfiles';

export default function ExploreProfiles() {
  const [view, setView] = useState<ProfilesView>('forYou');
  const seedUrls = useExploreSeedUrls();

  return (
    <ExploreShelf
      section="profiles"
      subtitle={view === 'bluesky' ? 'People you follow on Bluesky' : undefined}
    >
      <SegmentedControl
        value={view}
        onChange={(value) => setView(value as ProfilesView)}
        size="sm"
        radius="lg"
        w="fit-content"
        data={profileViewOptions}
      />

      {!seedUrls ? (
        // The seeds settle across two queries, not one this can suspend on.
        <ExploreProfilesListSkeleton />
      ) : (
        <ErrorBoundary
          fallback={<ErrorState message="Could not load profiles" />}
          resetKeys={[view]}
        >
          <Suspense fallback={<ExploreProfilesListSkeleton />}>
            {view === 'bluesky' ? (
              <BlueskyProfiles />
            ) : seedUrls.length > 0 ? (
              <RecommendedProfiles seedUrls={seedUrls} />
            ) : (
              <ProfileSuggestionList
                layout="scroller"
                users={[]}
                emptyMessage="No profiles to suggest yet"
              />
            )}
          </Suspense>
        </ErrorBoundary>
      )}
    </ExploreShelf>
  );
}
