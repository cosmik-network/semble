'use client';

import { useAuth } from '@/hooks/useAuth';
import { Avatar, Box, Card, Group, Stack, Text } from '@mantine/core';
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
  return (
    <Card radius={'50'} py={'xxs'} pl={'xxs'} pr={'md'} withBorder>
      <Group gap="md">
        <LinkButton href="/signup" size="md">
          Sign up
        </LinkButton>
        <Stack gap={0}>
          <Text fw={600} fz={'sm'} c={'gray'}>
            Want to look first?
          </Text>
          <LinkAnchor
            href="/explore"
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            fz={'sm'}
            underline="never"
            className={classes.exploreLink}
          >
            <Group gap={4} wrap="nowrap" align="center">
              Explore
              <BiRightArrowAlt size={16} />
            </Group>
          </LinkAnchor>
        </Stack>
      </Group>
    </Card>
  );
}
