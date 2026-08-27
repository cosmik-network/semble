'use client';

import { ActionIcon, Anchor, Box, Container, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { BiRightArrowAlt } from 'react-icons/bi';
import { IconType } from 'react-icons/lib';
import { FaBluesky } from 'react-icons/fa6';
import { HiUsers } from 'react-icons/hi';
import { LinkButton } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';
import { useSettings } from '@/providers/settings';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { AuthFeedView } from '../../lib/feedOptions';
import BlueskyHandleInput from '@/features/platforms/bluesky/components/blueskyHandleInput/BlueskyHandleInput';
import { normalizeHandle } from '../../lib/bskyHandle';

/*
 * Keyed by `AuthFeedView`, so a view that becomes auth-only is a build error
 * here until someone writes the line for it.
 */
const COPY: Record<AuthFeedView, { message: string; icon: IconType }> = {
  following: {
    message: 'Log in to see what the people and collections you follow save',
    icon: HiUsers,
  },
  bskyFollowing: {
    message: 'See what the people you follow on Bluesky save here',
    icon: FaBluesky,
  },
};

function BlueskyHandleForm(props: { onSubmit: (handle: string) => void }) {
  const [value, setValue] = useState('');

  const submit = (input: string) => {
    const handle = normalizeHandle(input);
    if (handle) props.onSubmit(handle);
  };

  return (
    <form
      style={{ width: '100%' }}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <BlueskyHandleInput
        value={value}
        onChange={setValue}
        onSelect={submit}
        rightSection={
          <ActionIcon
            type="submit"
            variant="subtle"
            color="gray"
            radius="md"
            aria-label="See this account's feed"
            disabled={normalizeHandle(value) === ''}
          >
            <BiRightArrowAlt size={18} />
          </ActionIcon>
        }
      />
    </form>
  );
}

interface Props {
  view: AuthFeedView;
}

/**
 * The Bluesky feed reads whichever account the reader names, so a guest is
 * asked for a handle rather than a session; `MyFeedContainer` serves the feed
 * once it is in settings. Every other following view can only offer login.
 */
export default function FeedLoginCta(props: Props) {
  const loginHref = useLoginHref();
  const { updateSetting } = useSettings();
  const copy = COPY[props.view];
  const asksForHandle = props.view === 'bskyFollowing';

  return (
    <Container p="xs" size="xl">
      <Box py="xl">
        <EmptyState
          message={copy.message}
          icon={copy.icon}
          button={
            asksForHandle ? (
              <Stack gap="xs" align="center" maw={320} w="100%">
                <BlueskyHandleForm
                  onSubmit={(handle) => updateSetting('bskyHandle', handle)}
                />
                <Text fz="sm" fw={500} c="dimmed">
                  {'Or '}
                  <Anchor href={loginHref} fz="sm" fw={500} c="blue">
                    log in
                  </Anchor>
                  {' to use your own account'}
                </Text>
              </Stack>
            ) : (
              <LinkButton variant="light" color="gray" href={loginHref}>
                Log in
              </LinkButton>
            )
          }
        />
      </Box>
    </Container>
  );
}
