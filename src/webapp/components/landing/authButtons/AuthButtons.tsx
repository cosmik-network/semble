'use client';

import { useAuth } from '@/hooks/useAuth';
import { Avatar, Box, Button, Group } from '@mantine/core';
import Link from 'next/link';
import { BiRightArrowAlt } from 'react-icons/bi';

export default function AuthButtons() {
  const { user, isLoading } = useAuth();

  return (
    <Box mt={'lg'}>
      {!isLoading && user ? (
        <Button
          component={Link}
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
        </Button>
      ) : (
        <UnauthenticatedButtons />
      )}
    </Box>
  );
}

function UnauthenticatedButtons() {
  return (
    <Group gap="md">
      <Button component={Link} href="/signup" size="lg">
        Sign up
      </Button>

      <Button
        component={Link}
        href="/login"
        size="lg"
        color="var(--mantine-color-dark-filled)"
        rightSection={<BiRightArrowAlt size={22} />}
      >
        Log in
      </Button>
    </Group>
  );
}
