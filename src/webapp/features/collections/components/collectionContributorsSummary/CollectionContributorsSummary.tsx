'use client';

import { Anchor, Text } from '@mantine/core';
import Link from 'next/link';
import useCollectionContributors from '../../lib/queries/useCollectionContributors';

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
  const { data } = useCollectionContributors({ collectionId, limit: 1 });
  const totalContributors = data?.pages[0]?.pagination.totalCount ?? 0;

  if (totalContributors === 0) {
    return null;
  }

  return (
    <>
      <Text fz="sm" fw={600} c="dimmed">
        ·
      </Text>
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
    </>
  );
}
