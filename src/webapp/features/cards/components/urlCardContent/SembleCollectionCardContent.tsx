'use client';

import CollectionCardPreview from '@/features/collections/components/collectionCardPreview/CollectionCardPreview';
import CollectionCardPreviewSkeleton from '@/features/collections/components/collectionCardPreview/Skeleton.CollectionCardPreview';
import useCollection from '@/features/collections/lib/queries/useCollection';
import { Avatar, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { CollectionAccessType } from '@semble/types';
import Link from 'next/link';
import { Suspense } from 'react';
import { FaSeedling } from 'react-icons/fa6';

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
              <Text fw={500} lineClamp={1} c={'bright'}>
                {collection.name}
              </Text>
            )}
          </Group>
          <Group gap={'xs'} wrap="nowrap">
            {accessType === CollectionAccessType.OPEN && (
              <Tooltip label="This collection is open to everyone. Add cards to help it grow.">
                <ThemeIcon
                  size={'sm'}
                  variant="light"
                  color={'green'}
                  radius={'xl'}
                >
                  <FaSeedling size={12} />
                </ThemeIcon>
              </Tooltip>
            )}
            <Avatar
              component={Link}
              href={`/profile/${collection.author.handle}`}
              src={collection.author.avatarUrl?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${collection.author.handle}'s avatar`}
              size={'sm'}
            />
          </Group>
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
