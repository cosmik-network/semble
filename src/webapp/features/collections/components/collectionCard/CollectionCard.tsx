'use client';

import type { Collection } from '@/api-client';
import { getRecordKey } from '@/lib/utils/atproto';
import { getRelativeTime } from '@/lib/utils/time';
import { Avatar, Card, Group, Stack, Text } from '@mantine/core';
import styles from './CollectionCard.module.css';
import CollectionCardPreview from '../collectionCardPreview/CollectionCardPreview';
import { Suspense } from 'react';
import CollectionCardPreviewSkeleton from '../collectionCardPreview/Skeleton.CollectionCardPreview';
import Link from 'next/link';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import CollectionCardDebugView from '../collectionCardDebugView/CollectionCardDebugView';
import { useRouter } from 'next/navigation';

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
  const { settings } = useUserSettings();
  const router = useRouter();

  return (
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      className={styles.root}
      h={'100%'}
      onClick={() =>
        router.push(`/profile/${collection.author.handle}/collections/${rkey}`)
      }
    >
      <Stack justify="space-between">
        <Stack gap={'xs'}>
          <Stack gap={0}>
            <Group justify="space-between" wrap="nowrap">
              <Text fw={500} lineClamp={1} c={'bright'}>
                {collection.name}
              </Text>
              {props.showAuthor && (
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
              )}
            </Group>
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

          {settings.tinkerMode && (
            <CollectionCardDebugView collection={props.collection} />
          )}

          <Group justify="space-between" gap={'xs'}>
            <Text c={'gray'} fz={'sm'}>
              {collection.cardCount}{' '}
              {collection.cardCount === 1 ? 'card' : 'cards'}
            </Text>
            <Text c={'gray'} fz={'sm'}>
              {relativeUpdateDate}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
