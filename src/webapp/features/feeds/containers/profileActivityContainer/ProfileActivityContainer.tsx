'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import useProfile from '@/features/profile/lib/queries/useProfile';
import ProfileActivityFeed from './ProfileActivityFeed';
import ProfileActivityContainerSkeleton from './Skeleton.ProfileActivityContainer';
import ProfileActivityContainerError from './Error.ProfileActivityContainer';

interface Props {
  handle: string;
}

export default function ProfileActivityContainer({ handle }: Props) {
  // Non-suspense query — profile.id may be undefined on first render.
  const { data: profile } = useProfile({
    didOrHandle: handle,
    includeStats: true,
  });

  if (!profile?.id) {
    return <ProfileActivityContainerSkeleton />;
  }

  return (
    <ErrorBoundary fallback={<ProfileActivityContainerError />}>
      <Suspense fallback={<ProfileActivityContainerSkeleton />}>
        <ProfileActivityFeed profileId={profile.id} />
      </Suspense>
    </ErrorBoundary>
  );
}
