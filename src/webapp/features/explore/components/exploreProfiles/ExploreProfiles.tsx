'use client';

import { SegmentedControl, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HiOutlineUsers } from 'react-icons/hi';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
import { ProfilesView, profileViewOptions } from '../../lib/profilesView';
import { ExploreProfilesListSkeleton } from './Skeleton.ExploreProfiles';
import ProfileSuggestionListError from '@/features/profile/components/profileSuggestionList/Error.ProfileSuggestionList';
import ProfileSuggestionList from '@/features/profile/components/profileSuggestionList/ProfileSuggestionList';
import RecommendedProfiles from './RecommendedProfiles';
import BlueskyProfiles from './BlueskyProfiles';

interface Props {
  /** Undefined while the parent is still resolving them. */
  seedUrls: string[] | undefined;
}

export default function ExploreProfiles(props: Props) {
  const [view, setView] = useState<ProfilesView>('forYou');

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

      {!props.seedUrls ? (
        // Seeds arrive from the parent as a prop, not a query this can
        // suspend on, so this one wait stays manual.
        <ExploreProfilesListSkeleton />
      ) : (
        <ErrorBoundary
          fallback={<ProfileSuggestionListError />}
          resetKeys={[view]}
        >
          <Suspense fallback={<ExploreProfilesListSkeleton />}>
            {view === 'bluesky' ? (
              <BlueskyProfiles />
            ) : props.seedUrls.length > 0 ? (
              <RecommendedProfiles seedUrls={props.seedUrls} />
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
