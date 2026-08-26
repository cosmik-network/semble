'use client';

import { SegmentedControl, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HiOutlineUsers } from 'react-icons/hi';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
import { ProfilesView, profileViewOptions } from '../../lib/profilesView';
import useExploreSeedUrls from '../../lib/queries/useExploreSeedUrls';
import { ExploreProfilesListSkeleton } from './Skeleton.ExploreProfiles';
import ProfileSuggestionListError from '@/features/profile/components/profileSuggestionList/Error.ProfileSuggestionList';
import ProfileSuggestionList from '@/features/profile/components/profileSuggestionList/ProfileSuggestionList';
import RecommendedProfiles from './RecommendedProfiles';
import BlueskyProfiles from './BlueskyProfiles';

export default function ExploreProfiles() {
  const [view, setView] = useState<ProfilesView>('forYou');
  const seedUrls = useExploreSeedUrls();

  return (
    <Stack>
      <ExploreSectionHeader
        icon={<HiOutlineUsers size={22} />}
        title="Profiles"
        subtitle={
          view === 'bluesky'
            ? 'People you follow on Bluesky'
            : 'People you might want to follow'
        }
        viewAllHref={EXPLORE_ROUTES.profiles}
      />

      <SegmentedControl
        value={view}
        onChange={(value) => setView(value as ProfilesView)}
        size="sm"
        radius="lg"
        w="fit-content"
        data={profileViewOptions}
      />

      {!seedUrls ? (
        // The seeds settle across two queries and a freeze, not one query this
        // can suspend on, so this one wait stays manual.
        <ExploreProfilesListSkeleton />
      ) : (
        <ErrorBoundary
          fallback={<ProfileSuggestionListError />}
          resetKeys={[view]}
        >
          <Suspense fallback={<ExploreProfilesListSkeleton />}>
            {view === 'bluesky' ? (
              <BlueskyProfiles />
            ) : seedUrls.length > 0 ? (
              <RecommendedProfiles seedUrls={seedUrls} />
            ) : (
              // No seeds.
              <ProfileSuggestionList
                layout="scroller"
                users={[]}
                emptyMessage="No profiles to suggest yet"
              />
            )}
          </Suspense>
        </ErrorBoundary>
      )}
    </Stack>
  );
}
