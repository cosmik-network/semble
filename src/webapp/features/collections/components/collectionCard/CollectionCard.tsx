'use client';

import type { Collection } from '@/api-client';
import { getRecordKey } from '@/lib/utils/atproto';
import { getRelativeTime } from '@/lib/utils/time';
import { Anchor, Avatar, Card, Group, Stack, Text } from '@mantine/core';
import styles from './CollectionCard.module.css';
import CollectionCardPreview from '../collectionCardPreview/CollectionCardPreview';
import { Suspense } from 'react';
import CollectionCardPreviewSkeleton from '../collectionCardPreview/Skeleton.CollectionCardPreview';
import Link from 'next/link';

interface Props {
  size?: 'large' | 'compact' | 'list' | 'basic';
  showAuthor?: boolean;
  collection: Collection;
}

export default function CollectionCard(props: Props) {
  const { collection } = props;
  const rkey = getRecordKey(collection.uri!!);
  const time = getRelativeTime(collection.updatedAt);
  const relativeUpdateDate =
    time === 'just now' ? `Updated ${time}` : `Updated ${time} ago`;

  return (
    <Anchor
      component={Link}
      href={`/profile/${collection.author.handle}/collections/${rkey}`}
      underline="never"
    >
      <Card
        withBorder
        radius={'lg'}
        p={'sm'}
        className={styles.root}
        h={'100%'}
      >
        <Stack justify="space-between">
          <Stack gap={'xs'}>
            <Stack gap={0}>
              <Text fw={500} lineClamp={1} c={'bright'}>
                {collection.name}
              </Text>
              {collection.description && (
                <Text c={'gray'} lineClamp={2}>
                  {collection.description}
                </Text>
              )}
            </Stack>

            <Suspense fallback={<CollectionCardPreviewSkeleton />}>
              <CollectionCardPreview
                rkey={rkey}
                handle={props.collection.author.handle}
              />
            </Suspense>

            <Group justify="space-between" gap={'xs'}>
              <Text c={'gray'}>
                {collection.cardCount}{' '}
                {collection.cardCount === 1 ? 'card' : 'cards'}
              </Text>
              <Text c={'gray'}>{relativeUpdateDate}</Text>
            </Group>
            {props.showAuthor && (
              <Group gap={'xs'}>
                <Avatar
                  src={collection.author.avatarUrl}
                  alt={`${collection.author.handle}'s avatar`}
                  size={'sm'}
                />

                <Text fw={500} c={'bright'} span>
                  {collection.author.name}
                </Text>
              </Group>
            )}
          </Stack>
        </Stack>
      </Card>
    </Anchor>
  );
}
