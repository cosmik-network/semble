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
} from '@mantine/core';
import useCollection from '../../lib/queries/useCollection';
import Link from 'next/link';
import { Suspense } from 'react';
import CollectionActions from '../../components/collectionActions/CollectionActions';
import CollectionContainerError from './Error.CollectionContainer';
import CollectionContainerSkeleton from './Skeleton.CollectionContainer';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';
import { CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import CollectionStats from '../../components/collectionStats/CollectionStats';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainer(props: Props) {
  const { data: featureFlags } = useFeatureFlags();
  const { data, isPending, error } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const collection = data.pages[0];
  const accessType = collection.accessType;
  const marginUrl = getMarginUrl(collection?.uri, collection?.author.handle);

  if (isPending) {
    return <CollectionContainerSkeleton />;
  }

  if (error) {
    return <CollectionContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Stack justify="flex-start">
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
            <CollectionStats
              collectionId={collection.id}
              handle={props.handle}
              rkey={props.rkey}
            />
          </Stack>

          <Group gap={'xs'}>
            <Group gap={5}>
              <Avatar
                size={'sm'}
                component={Link}
                href={`/profile/${collection.author.handle}`}
                src={collection.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${collection.author.name}'s' avatar`}
              />
              <Anchor
                component={Link}
                href={`/profile/${collection.author.handle}`}
                fw={600}
                c="bright"
              >
                {collection.author.name}
              </Anchor>
            </Group>
          </Group>
        </Group>

        <Group justify="space-between" gap={'xs'}>
          <CardFilters.Root>
            <CardFilters.SortSelect />
            <CardFilters.ViewToggle />
            <CardFilters.TypeFilter />
          </CardFilters.Root>

          <CollectionActions
            collection={{
              ...collection,
              rkey: props.rkey,
            }}
          />
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
