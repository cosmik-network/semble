'use client';

import { useAuth } from '@/hooks/useAuth';
import { Avatar, Box, Card, Group } from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import { LinkAnchor, LinkButton } from '@/components/link/MantineLink';
import classes from './AuthButtons.module.css';

export default function AuthButtons() {
  const { user, isLoading } = useAuth();

  return (
    <Box mt={'lg'}>
      {!isLoading && user ? (
        <LinkButton
          href="/home"
          size="lg"
          color="var(--mantine-color-dark-filled)"
          leftSection={
            <Avatar
              src={user?.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
              alt={`${user?.handle}'s avatar`}
              size={'sm'}
            />
          }
          rightSection={<BiRightArrowAlt size={22} />}
        >
          @{user?.handle}
        </LinkButton>
      ) : (
        <UnauthenticatedButtons />
      )}
    </Box>
  );
}

function UnauthenticatedButtons() {
  // The pill hugs the Sign up button: 3px of padding on its side, more on the
  // right so the bare link isn't crowded against the border. Padding on the
  // button's side any larger and the pill reads chunky rather than snug.
  return (
    <Card radius={999} p={'xxs'} pr={'sm'} withBorder>
      <Group gap="sm">
        <LinkButton href="/signup" size="md">
          Sign up
        </LinkButton>
        <LinkAnchor
          href="/explore"
          target="_blank"
          rel="noopener noreferrer"
          fw={600}
          fz={'sm'}
          underline="never"
          className={classes.exploreLink}
        >
          <Group gap={'xs'} wrap="nowrap" align="center">
            Explore first
            <BiRightArrowAlt size={16} />
          </Group>
        </LinkAnchor>
      </Group>
    </Card>
  );
}
