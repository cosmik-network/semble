import type { Metadata } from 'next';
import Header from '@/components/navigation/header/Header';
import ProfileHeader from '@/features/profile/components/profileHeader/ProfileHeader';
import ProfileTabs from '@/features/profile/components/profileTabs/ProfileTabs';
import { Box, Container } from '@mantine/core';
import { Fragment, Suspense } from 'react';
import ProfileHeaderSkeleton from '@/features/profile/components/profileHeader/Skeleton.ProfileHeader';
import BackButton from '@/components/navigation/backButton/BackButton';
import { getProfile } from '@/features/profile/lib/dal';
import { isNotFoundApiError } from '@/api-client/errors';

interface Props {
  params: Promise<{ handle: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  // Don't throw here — ProfileHeader renders the not-found page for missing
  // profiles. Fall back to minimal metadata so metadata generation never fails.
  const profile = await getProfile(handle).catch((error: unknown) => {
    if (isNotFoundApiError(error, 'PROFILE_NOT_FOUND')) return null;
    throw error;
  });

  if (!profile) {
    return { title: 'Profile not found — Semble' };
  }

  return {
    title: {
      template: '%s — Semble',
      default: `${profile.name} (${handle})`,
    },
    description:
      profile.description ?? `Explore ${profile.name}'s profile on Semble`,
    authors: [
      {
        name: profile.name,
        url: `${process.env.APP_URL}/profile/${handle}`,
      },
    ],
    alternates: {
      types: {
        '': `at://${profile.id}`,
      },
    },
    other: {
      'atprotocol:creator': `at://${profile.id}`,
    },
  };
}

export default async function Layout(props: Props) {
  const { handle } = await props.params;

  return (
    <Fragment>
      <Header>
        <BackButton />
      </Header>
      <Suspense fallback={<ProfileHeaderSkeleton />} key={handle}>
        <ProfileHeader handle={handle} />
      </Suspense>
      <Box
        style={{
          position: 'sticky',
          top: 55,
          zIndex: 1,
        }}
      >
        <Container px={'xs'} mt={'md'} size={'xl'}>
          <ProfileTabs handle={handle} />
        </Container>
      </Box>
      {props.children}
    </Fragment>
  );
}
