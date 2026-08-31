'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useProfileWithStats } from '@/features/profile/lib/queries/useProfile';
import ProfileActivityFeed from './ProfileActivityFeed';
import ProfileActivityContainerSkeleton from './Skeleton.ProfileActivityContainer';
import { Container } from '@mantine/core';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';

interface Props {
  handle: string;
}

export default function ProfileActivityContainer({ handle }: Props) {
  const { data: profile } = useProfileWithStats({
    didOrHandle: handle,
  });

  if (!profile?.id) {
    return <ProfileActivityContainerSkeleton />;
  }

  return (
    <ErrorBoundary
      fallback={
        <Container p="xs" size="xl">
          <ErrorState message="Could not load activity" />
        </Container>
      }
    >
      <Suspense fallback={<ProfileActivityContainerSkeleton />}>
        <ProfileActivityFeed profileId={profile.id} />
      </Suspense>
    </ErrorBoundary>
  );
}
