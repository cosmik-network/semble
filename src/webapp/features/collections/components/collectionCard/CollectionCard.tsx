'use client';

import type { Collection } from '@/api-client';
import { getRecordKey } from '@/lib/utils/atproto';
import { getRelativeTime } from '@/lib/utils/time';
import {
  AspectRatio,
  Avatar,
  Box,
  Card,
  Group,
  Stack,
  Image,
  Text,
  Center,
  Grid,
} from '@mantine/core';
import styles from './CollectionCard.module.css';
import { useRouter } from 'next/navigation';
import useCollection from '../../lib/queries/useCollection';

interface Props {
  size?: 'large' | 'compact' | 'list' | 'basic';
  showAuthor?: boolean;
  collection: Collection;
}

export default function CollectionCard(props: Props) {
  const router = useRouter();
  const { collection } = props;
  const rkey = getRecordKey(collection.uri!!);
  const { data } = useCollection({
    rkey: rkey,
    handle: props.collection.author.handle,
    limit: 4,
  });
  const cards = data?.pages.flatMap((col) => col.urlCards) ?? [];

  const time = getRelativeTime(collection.updatedAt);
  const relativeUpdateDate =
    time === 'just now' ? `Updated ${time}` : `Updated ${time} ago`;

  return (
    <Card
      withBorder
      onClick={() =>
        router.push(`/profile/${collection.author.handle}/collections/${rkey}`)
      }
      radius={'lg'}
      p={'sm'}
      className={styles.root}
    >
      <Stack justify="space-between" h={'100%'}>
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

          {cards.length > 0 && (
            <Grid gutter={'xs'}>
              {cards.map((c) => (
                <Grid.Col span={3}>
                  {c.cardContent.thumbnailUrl ? (
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        src={c.cardContent.thumbnailUrl}
                        alt={`${c.cardContent.url} social preview image`}
                        radius={'md'}
                        h={45}
                        w={'100%'}
                      />
                    </AspectRatio>
                  ) : (
                    <AspectRatio ratio={16 / 9}>
                      <Card p={'xs'} radius={'md'} h={45} w={'100%'} withBorder>
                        <Center>
                          <Text fz={'xs'} fw={500} lineClamp={1}>
                            {c.cardContent.title ??
                              c.cardContent.description ??
                              c.cardContent.url}
                          </Text>
                        </Center>
                      </Card>
                    </AspectRatio>
                  )}
                </Grid.Col>
              ))}
            </Grid>
          )}

          <Group justify="space-between">
            <Text c={'gray'}>
              {collection.cardCount}{' '}
              {collection.cardCount === 1 ? 'card' : 'cards'} ·{' '}
              {relativeUpdateDate}
            </Text>
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
  );
}
