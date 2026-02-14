'use client';

import { Badge, Skeleton } from '@mantine/core';
import { Suspense } from 'react';
import useCollectionFollowersCount from '@/features/follows/lib/queries/useCollectionFollowersCount';
import Link from 'next/link';

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
    <Badge
      component={Link}
      href={`/profile/${handle}/collections/${rkey}/followers`}
      variant="light"
      color="gray"
      size="lg"
      style={{ cursor: 'pointer' }}
    >
      {followersCount.count} Follower{followersCount.count !== 1 ? 's' : ''}
    </Badge>
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
