import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { Avatar, Box, Button, Group } from '@mantine/core';
import Link from 'next/link';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BiRightArrowAlt } from 'react-icons/bi';

export default async function AuthButtons() {
  const session = await verifySessionOnServer();

  return (
    <Box mt={'lg'}>
      <ErrorBoundary fallback={<UnauthenticatedButtons />}>
        <Suspense fallback={<UnauthenticatedButtons />}>
          <Button
            component={Link}
            href="/home"
            size="lg"
            color="var(--mantine-color-dark-filled)"
            leftSection={
              <Avatar
                src={session?.avatarUrl}
                alt={`${session?.handle}'s avatar`}
                size={'sm'}
              />
            }
            rightSection={<BiRightArrowAlt size={22} />}
          >
            @{session?.handle}
          </Button>
        </Suspense>
      </ErrorBoundary>
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
