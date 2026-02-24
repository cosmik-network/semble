'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Tooltip,
  Badge,
  Box,
  Divider,
} from '@mantine/core';
import useCollection from '../../lib/queries/useCollection';
import Link from 'next/link';
import { Fragment, Suspense } from 'react';
import CollectionContributorsSummary from '../collectionContributorsSummary/CollectionContributorsSummary';
import CollectionActions from '../collectionActions/CollectionActions';
import { CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { getRelativeTime } from '@/lib/utils/time';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionHeader(props: Props) {
  const { data, isPending } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  if (isPending) {
    return null; // You can add a skeleton here if needed
  }

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
              ? 'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-green-9))'
              : 'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-grape-9))',
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
              ? 'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-green-1))'
              : 'linear-gradient(to top, var(--mantine-color-body), var(--mantine-color-grape-1))',
          pointerEvents: 'none',
        }}
      />
      <Container p="xs" size="xl">
        <Stack gap={'lg'}>
          <Stack gap={'xs'}>
            <Group justify="space-between" align="start">
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
                {collection.description && (
                  <Text c="gray" mt="lg" maw={700}>
                    {collection.description}
                  </Text>
                )}
              </Stack>
            </Group>

            <Group justify="space-between" gap={'lg'}>
              <Stack gap={'xs'}>
                <Group gap={5}>
                  <Text fw={600} fz={'sm'} c={'dimmed'} span>
                    By
                  </Text>
                  <Group gap={5}>
                    <Avatar
                      size={'xs'}
                      radius={'sm'}
                      component={Link}
                      href={`/profile/${collection.author.handle}`}
                      src={collection.author.avatarUrl?.replace(
                        'avatar',
                        'avatar_thumbnail',
                      )}
                      alt={`${collection.author.name}'s avatar`}
                    />
                    <Anchor
                      component={Link}
                      href={`/profile/${collection.author.handle}`}
                      fw={600}
                      c="bright"
                    >
                      {collection.author.name}
                    </Anchor>
                    <Suspense fallback={null}>
                      <CollectionContributorsSummary
                        collectionId={collection.id}
                        handle={props.handle}
                        rkey={props.rkey}
                      />
                    </Suspense>
                  </Group>
                </Group>
                <Group gap={'xs'}>
                  <Group gap={5}>
                    <Text fw={500} fz={'sm'} c={'bright'}>
                      {collection.cardCount ?? 0}
                    </Text>
                    <Text fw={500} fz={'sm'} c={'dimmed'}>
                      Cards
                    </Text>
                  </Group>

                  <Divider orientation="vertical" />

                  {/*<Stack gap={0} align="center">
                              <Text fw={500} fz={'sm'} c={'bright'}>
                                Followers
                              </Text>
                              <Text fw={500} fz={'sm'} c={'dimmed'}>
                                TBD
                              </Text>
                            </Stack>*/}

                  <Group gap={5}>
                    <Text fw={500} fz={'sm'} c={'bright'}>
                      Created
                    </Text>
                    <Text fw={500} fz={'sm'} c={'dimmed'}>
                      {getRelativeTime(collection.createdAt)}
                    </Text>
                  </Group>
                  <Divider orientation="vertical" />

                  <Group gap={5}>
                    <Text fw={500} fz={'sm'} c={'bright'}>
                      Updated
                    </Text>
                    <Text fw={500} fz={'sm'} c={'dimmed'}>
                      {getRelativeTime(collection.updatedAt)}
                    </Text>
                  </Group>
                </Group>
              </Stack>

              <CollectionActions
                collection={{
                  ...collection,
                  rkey: props.rkey,
                }}
              />
            </Group>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
