'use client';

import type { User } from '@/api-client';
import { Anchor, Group, Text } from '@mantine/core';
import { LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  author: User;
}

export default function CardAuthorRow(props: Props) {
  return (
    <Group gap={'7'}>
      <Text fz={'xs'} c={'dimmed'} fw={500}>
        By{' '}
      </Text>
      <Group gap={'5'}>
        <LinkAvatar
          href={`/profile/${props.author.handle}`}
          src={props.author.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
          alt={`${props.author.handle}'s avatar`}
          size={'xs'}
          radius={'sm'}
        />
        <Anchor
          href={`/profile/${props.author.handle}`}
          fz={'xs'}
          fw={600}
          c={'bright'}
          underline="never"
          onClick={(e) => e.stopPropagation()}
        >
          {props.author.name || `@${props.author.handle}`}
        </Anchor>
      </Group>
    </Group>
  );
}
