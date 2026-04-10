'use client';

import { Skeleton } from '@mantine/core';
import { Suspense } from 'react';
import useCollectionFollowersCount from '@/features/follows/lib/queries/useCollectionFollowersCount';
import { LinkBadge } from '@/components/link/MantineLink';

interface Props {
  collectionId: string;
  handle: string;
  rkey: string;
}

function CollectionStatsContent({ collectionId, handle, rkey }: Props) {
  const { data: followersCount } = useCollectionFollowersCount({
    collectionId,
  });

  return (
    <LinkBadge
      href={`/profile/${handle}/collections/${rkey}/followers`}
      variant="light"
      color="gray"
      size="lg"
      style={{ cursor: 'pointer' }}
    >
      {followersCount.count} Follower{followersCount.count !== 1 ? 's' : ''}
    </LinkBadge>
  );
}

export default function CollectionStats({ collectionId, handle, rkey }: Props) {
  return (
    <Suspense fallback={<Skeleton height={28} width={100} radius="sm" />}>
      <CollectionStatsContent
        collectionId={collectionId}
        handle={handle}
        rkey={rkey}
      />
    </Suspense>
  );
}
