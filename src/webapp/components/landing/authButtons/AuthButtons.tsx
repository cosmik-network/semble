'use client';

import { useAuth } from '@/hooks/useAuth';
import { Avatar, Box, Group } from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import { LinkButton } from '@/components/link/MantineLink';

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
  return (
    <Group gap="md">
      <LinkButton href="/signup" size="lg">
        Sign up
      </LinkButton>

      <LinkButton
        href="/login"
        size="lg"
        color="var(--mantine-color-dark-filled)"
        rightSection={<BiRightArrowAlt size={22} />}
      >
        Log in
      </LinkButton>
    </Group>
  );
}
