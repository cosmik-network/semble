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
import CollectionActions from '../../components/collectionActions/CollectionActions';
import CollectionContainerError from './Error.CollectionContainer';
import CollectionContainerSkeleton from './Skeleton.CollectionContainer';
import { CardSortField, SortOrder } from '@semble/types';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';
import useCollectionSearch from '../../lib/queries/useCollectionSearch';
import { FiPlus } from 'react-icons/fi';
import { FaBluesky } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { useOs } from '@mantine/hooks';

interface Props {
  rkey: string;
  handle: string;
}

type SortOption = 'newest' | 'oldest' | 'most-popular';

export default function CollectionContainer(props: Props) {
  const os = useOs();
  const { user } = useAuth();
  const { data, isPending, error } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const firstPage = data.pages[0];
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data: searchResults, isLoading: isLoadingSearchResults } =
    useCollectionSearch({ query: '💎' });

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

  // Check if this is a gems collection and if user has their own gems collection
  const isGemsCollection =
    firstPage?.name.includes('💎') && firstPage?.name.includes('2025');
  const hasOwnGemsCollection =
    !isLoadingSearchResults &&
    searchResults &&
    searchResults.collections.length > 0;
  const isAuthor = user?.handle === firstPage?.author.handle;

  // Create share URL for Bluesky intent
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Check out my 💎 picks of 2025 on Semble`;
  const isMobile = os === 'ios' || os === 'android';
  const blueskyShareUrl = `${isMobile ? 'bluesky://intent/compose' : 'https://bsky.app/intent/compose'}?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;

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
            allowDeselect={false}
            value={sortOption}
            onChange={(value) => setSortOption(value as SortOption)}
            data={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'most-popular', label: 'Most Popular' },
            ]}
          />

          <Group gap={'xs'}>
            {isGemsCollection && (
              <Group gap={'xs'}>
                <Button
                  component={Link}
                  href="/explore/gems-of-2025"
                  variant="light"
                  color="blue"
                  leftSection={<>💎</>}
                >
                  See all picks
                </Button>

                {isAuthor && (
                  <Button
                    component="a"
                    href={blueskyShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    color="cyan"
                    leftSection={<FaBluesky />}
                  >
                    Share on Bluesky
                  </Button>
                )}

                {!isLoadingSearchResults && !hasOwnGemsCollection && (
                  <Button
                    variant="light"
                    color="grape"
                    size="sm"
                    leftSection={<FiPlus />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Create your own 💎 picks
                  </Button>
                )}
              </Group>
            )}

            <CollectionActions
              id={firstPage.id}
              rkey={props.rkey}
              name={firstPage.name}
              description={firstPage.description}
              authorHandle={firstPage.author.handle}
            />
          </Group>
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
