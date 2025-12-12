'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Select,
  Button,
} from '@mantine/core';
import useCollection from '../../lib/queries/useCollection';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import CollectionContainerError from '../collectionContainer/Error.CollectionContainer';
import CollectionContainerSkeleton from '../collectionContainer/Skeleton.CollectionContainer';
import { CardSortField, SortOrder } from '@semble/types';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';

interface Props {
  rkey: string;
  handle: string;
}

type SortOption = 'newest' | 'oldest' | 'most-popular';

export default function CollectionEmbedContainer(props: Props) {
  const { data, isPending, error } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const firstPage = data.pages[0];
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getSortParams = (option: SortOption) => {
    switch (option) {
      case 'newest':
        return { sortBy: CardSortField.CREATED_AT, sortOrder: SortOrder.DESC };
      case 'oldest':
        return { sortBy: CardSortField.CREATED_AT, sortOrder: SortOrder.ASC };
      case 'most-popular':
        return {
          sortBy: CardSortField.LIBRARY_COUNT,
          sortOrder: SortOrder.DESC,
        };
      default:
        return { sortBy: CardSortField.CREATED_AT, sortOrder: SortOrder.DESC };
    }
  };

  const { sortBy, sortOrder } = getSortParams(sortOption);

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
            <Title order={1}>{firstPage.name}</Title>
            {firstPage.description && (
              <Text c="gray" mt="lg">
                {firstPage.description}
              </Text>
            )}
          </Stack>

          <Group gap={'xs'}>
            <Text fw={600} c="gray">
              By
            </Text>
            <Group gap={5}>
              <Avatar
                size={'sm'}
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                src={firstPage.author.avatarUrl}
                alt={`${firstPage.author.name}'s' avatar`}
              />
              <Anchor
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                fw={600}
                c="bright"
              >
                {firstPage.author.name}
              </Anchor>
            </Group>
          </Group>
        </Group>

        <Group justify="space-between" align="end">
          <Select
            mr={'auto'}
            size="sm"
            variant="filled"
            label="Sort by"
            allowDeselect={false}
            value={sortOption}
            onChange={(value) => setSortOption(value as SortOption)}
            data={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'most-popular', label: 'Most Popular' },
            ]}
          />
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent
            rkey={props.rkey}
            handle={props.handle}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </Suspense>
      </Stack>

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName="💎 Picks of 2025"
      />
    </Container>
  );
}
