'use client';

import CollectionCardPreview from '@/features/collections/components/collectionCardPreview/CollectionCardPreview';
import CollectionCardPreviewSkeleton from '@/features/collections/components/collectionCardPreview/Skeleton.CollectionCardPreview';
import useCollection from '@/features/collections/lib/queries/useCollection';
import { Group, Stack, Text } from '@mantine/core';
import { CollectionAccessType } from '@semble/types';
import { Suspense } from 'react';
import { LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  rkey: string;
  handle: string;
}

export default function SembleCollectionCardContent(props: Props) {
  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const collection = data.pages[0];
  const accessType = collection.accessType;

  return (
    <Stack gap={'xs'}>
      <Stack gap={0}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap={4}>
            {collection.name && (
              <Text
                fw={500}
                lineClamp={1}
                c={
                  accessType === CollectionAccessType.OPEN ? 'green' : 'bright'
                }
              >
                {collection.name}
              </Text>
            )}
          </Group>

          <LinkAvatar
            href={`/profile/${collection.author.handle}`}
            src={collection.author.avatarUrl?.replace(
              'avatar',
              'avatar_thumbnail',
            )}
            alt={`${collection.author.handle}'s avatar`}
            size={'sm'}
          />
        </Group>
        {collection.description && (
          <Text c={'gray'} fz={'sm'} lineClamp={3}>
            {collection.description}
          </Text>
        )}
      </Stack>

      <Suspense fallback={<CollectionCardPreviewSkeleton />}>
        <CollectionCardPreview rkey={props.rkey} handle={props.handle} />
      </Suspense>
    </Stack>
  );
}
