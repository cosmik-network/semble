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
              <Text fw={700} c="grape">
                Collection
              </Text>

              {accessType === CollectionAccessType.OPEN &&
                featureFlags?.openCollections && (
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
            <Title order={1}>{collection.name}</Title>
            {collection.description && (
              <Text c="gray" mt="lg">
                {collection.description}
              </Text>
            )}
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
            <CardFilters.TypeFilter />
            <CardFilters.ViewToggle />
          </CardFilters.Root>

          <CollectionActions
            id={collection.id}
            rkey={props.rkey}
            name={collection.name}
            description={collection.description}
            accessType={collection.accessType}
            authorHandle={collection.author.handle}
            cardCount={collection.cardCount}
          />
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
