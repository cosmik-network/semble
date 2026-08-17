'use client';

import type { ReactNode } from 'react';
import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { LinkAnchor, LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  href: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  description?: string;
  note?: ReactNode;
  action: ReactNode;
}

export default function SuggestionCard(props: Props) {
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

      {props.note && (
        <Box mt={'auto'} pt={'sm'}>
          {props.note}
        </Box>
      )}
    </Card>
  );
}
