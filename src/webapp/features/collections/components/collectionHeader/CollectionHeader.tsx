'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
  Badge,
  Box,
} from '@mantine/core';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import useCollection from '../../lib/queries/useCollection';
import { Fragment, Suspense } from 'react';
import CollectionActions from '../collectionActions/CollectionActions';
import CollectionStats from '../collectionStats/CollectionStats';
import { CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import CollectionActionsSkeleton from '../collectionActions/Skeleton.CollectionActions';
import CollectionStatsSkeleton from '../collectionStats/Skeleton.CollectionStats';
import { getRelativeTime } from '@/lib/utils/time';
import { LinkAvatar } from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import classes from './CollectionHeader.module.css';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionHeader(props: Props) {
  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const collection = data.pages[0];
  const accessType = collection.accessType;
  const marginUrl = getMarginUrl(collection?.uri, collection?.author.handle);

  return (
    <Fragment>
      {/* Light mode gradient */}
      <Box
        lightHidden
        style={{
          width: '100%',
          height: '40px',
          background:
            accessType === CollectionAccessType.OPEN
              ? 'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-green-9) 30%, transparent))'
              : 'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-grape-9) 30%, transparent))',
          pointerEvents: 'none',
        }}
      />
      {/* Dark mode gradient */}
      <Box
        darkHidden
        style={{
          width: '100%',
          height: '40px',
          background:
            accessType === CollectionAccessType.OPEN
              ? 'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-green-1) 40%, transparent))'
              : 'linear-gradient(to top, var(--mantine-color-body), color-mix(in srgb, var(--mantine-color-grape-1) 40%, transparent))',
          pointerEvents: 'none',
        }}
      />
      <Container p="xs" size="xl">
        <Stack gap={'xs'}>
          <Group justify="space-between" align="flex-start" gap={'xs'}>
            <Stack gap={0}>
              <Group gap={'xs'}>
                <Text
                  fw={700}
                  c={
                    collection.accessType === CollectionAccessType.OPEN
                      ? 'green'
                      : 'grape'
                  }
                >
                  Collection
                </Text>

                {accessType === CollectionAccessType.OPEN && (
                  <Tooltip label="This collection is open to everyone. Add cards to help it grow.">
                    <Badge
                      color="green"
                      leftSection={<FaSeedling />}
                      variant="light"
                    >
                      Open
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              <Group gap={8}>
                <Title order={1}>{collection.name}</Title>
                {isMarginUri(collection.uri) && (
                  <MarginLogo size={20} marginUrl={marginUrl} />
                )}
              </Group>
            </Stack>

            <Group gap={'xs'} wrap="nowrap">
              <LinkAvatar
                size={32}
                href={`/profile/${collection.author.handle}`}
                src={collection.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${collection.author.name}'s avatar`}
              />
              <Stack gap={0}>
                <Group gap={'xs'}>
                  <Anchor
                    href={`/profile/${collection.author.handle}`}
                    fw={600}
                    fz={'sm'}
                    c="bright"
                    lh={1.3}
                  >
                    {collection.author.name}
                  </Anchor>
                  {isBotAccount(collection.author) && <BotLabel />}
                </Group>
                <Text fz="sm" fw={500} c="gray" lh={1.3}>
                  Updated {getRelativeTime(collection.updatedAt)}
                </Text>
              </Stack>
            </Group>
          </Group>

          <Stack gap={'xs'} mt={'sm'}>
            {collection.description && (
              <RichTextRenderer
                text={collection.description}
                textProps={{ c: 'gray', maw: 700 }}
              />
            )}

            <Group justify="space-between" gap={'lg'}>
              <Suspense
                fallback={
                  <Box style={{ visibility: 'hidden' }}>
                    <CollectionStatsSkeleton
                      accessType={collection.accessType}
                    />
                  </Box>
                }
              >
                <CollectionStats
                  collection={collection}
                  handle={props.handle}
                  rkey={props.rkey}
                />
              </Suspense>

              <Box className={classes.actions}>
                <Suspense fallback={<CollectionActionsSkeleton />}>
                  <CollectionActions
                    collection={{
                      ...collection,
                      rkey: props.rkey,
                    }}
                  />
                </Suspense>
              </Box>
            </Group>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
