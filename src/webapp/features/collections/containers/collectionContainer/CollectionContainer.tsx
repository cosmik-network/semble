'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
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

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainer(props: Props) {
  const { data, isPending, error } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const collection = data.pages[0];

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
            <Text fw={700} c="grape">
              Collection
            </Text>
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

        <Group justify="space-between">
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
          />
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
