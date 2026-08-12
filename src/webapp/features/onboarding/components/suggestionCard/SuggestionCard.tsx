'use client';

import type { ReactNode } from 'react';
import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { LinkAnchor, LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  /** Their profile. The avatar and the name both point here. */
  href: string;
  name: string;
  /** Bare, without the @ — this renders it. */
  handle: string;
  avatarUrl?: string;
  description?: string;
  /** "Followed on Bluesky", rendered with the Bluesky mark by the caller. */
  note?: ReactNode;
  /** The FollowButton. Passed in so this component owns no follow state. */
  action: ReactNode;
}

/**
 * One person suggestion. Collections deliberately do not use this — they render
 * through the app's own CollectionCard, see FollowStep.
 */
export default function SuggestionCard(props: Props) {
  // New tab: looking someone up mid-onboarding should not cost you the flow.
  const linkProps = {
    href: props.href,
    target: '_blank',
    rel: 'noopener noreferrer',
  } as const;

  return (
    <Card withBorder radius={'lg'} p={'md'} h={'100%'}>
      <Group wrap="nowrap" align="center" gap={'sm'}>
        <LinkAvatar
          {...linkProps}
          // The CDN serves a smaller file under this name.
          src={props.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
          alt={`${props.handle}'s avatar`}
          size={'md'}
        />

        {/* miw=0 is what lets the name clamp: without it the flex item pushes
            the button out of the card. */}
        <Stack gap={0} miw={0} flex={1}>
          <LinkAnchor
            {...linkProps}
            fw={600}
            c={'bright'}
            underline="hover"
            lineClamp={1}
          >
            {props.name}
          </LinkAnchor>

          <Text fw={500} c={'gray'} lineClamp={1}>
            @{props.handle}
          </Text>
        </Stack>

        {props.action}
      </Group>

      {props.description && (
        <Text fz={'sm'} c={'gray'} lineClamp={2} mt={'sm'}>
          {props.description}
        </Text>
      )}

      {/* Card is a flex column, so mt="auto" lines the notes up across a row
          however long the bios above them run. */}
      {props.note && (
        <Box mt={'auto'} pt={'sm'}>
          {props.note}
        </Box>
      )}
    </Card>
  );
}
