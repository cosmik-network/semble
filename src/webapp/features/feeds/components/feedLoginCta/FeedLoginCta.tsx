'use client';

import { Box, Container } from '@mantine/core';
import { IconType } from 'react-icons/lib';
import { FaBluesky } from 'react-icons/fa6';
import { HiUsers } from 'react-icons/hi';
import { LinkButton } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { AuthFeedView } from '../../lib/feedOptions';

/*
 * What a guest is told in place of a feed the API answers off their session.
 * Keyed by `AuthFeedView`, so a view that becomes auth-only is a build error
 * here until someone writes the line for it.
 */
const COPY: Record<AuthFeedView, { message: string; icon: IconType }> = {
  following: {
    message: 'Log in to see what the people and collections you follow save',
    icon: HiUsers,
  },
  bskyFollowing: {
    message: 'Log in to see what the people you follow on Bluesky save here',
    icon: FaBluesky,
  },
};

interface Props {
  view: AuthFeedView;
}

export default function FeedLoginCta(props: Props) {
  const loginHref = useLoginHref();
  const copy = COPY[props.view];

  // Same container and vertical room the empty feed takes, so switching views
  // as a guest does not move the page around.
  return (
    <Container p="xs" size="xl">
      <Box py="xl">
        <ProfileEmptyTab
          message={copy.message}
          icon={copy.icon}
          button={
            <LinkButton variant="light" color="gray" href={loginHref}>
              Log in
            </LinkButton>
          }
        />
      </Box>
    </Container>
  );
}
