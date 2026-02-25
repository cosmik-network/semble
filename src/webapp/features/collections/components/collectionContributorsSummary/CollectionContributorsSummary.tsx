'use client';

import { Anchor, Avatar, AvatarGroup, Text } from '@mantine/core';
import Link from 'next/link';
import useCollectionContributors from '../../lib/queries/useCollectionContributors';
import { Fragment } from 'react';

interface Props {
  collectionId: string;
  handle: string;
  rkey: string;
}

export default function CollectionContributorsShortcut({
  collectionId,
  handle,
  rkey,
}: Props) {
  const { data } = useCollectionContributors({ collectionId, limit: 3 });
  const totalContributors = data?.pages[0]?.pagination.totalCount ?? 0;

  if (totalContributors === 0) {
    return null;
  }

  return (
    <Fragment>
      <Text fz="sm" fw={600} c="dimmed">
        ·
      </Text>
      <AvatarGroup>
        {data.pages[0].users.slice(0, 3).map((u) => (
          <Avatar
            key={u.id}
            component={Link}
            href={`/profile/${handle}/collections/${rkey}/contributors`}
            src={u.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${u.handle}'s avatar`}
            size={20}
            radius={6}
          />
        ))}
      </AvatarGroup>
      <Anchor
        component={Link}
        href={`/profile/${handle}/collections/${rkey}/contributors`}
        fz="sm"
        fw={600}
        c="blue"
      >
        {totalContributors}{' '}
        {totalContributors === 1 ? 'Contributor' : 'Contributors'}
      </Anchor>
    </Fragment>
  );
}
