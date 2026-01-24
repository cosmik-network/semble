'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Button,
  Badge,
} from '@mantine/core';
import useCollection from '../../lib/queries/useCollection';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import CollectionActions from '../../components/collectionActions/CollectionActions';
import CollectionContainerError from './Error.CollectionContainer';
import CollectionContainerSkeleton from './Skeleton.CollectionContainer';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';
import { FiPlus, FiLock, FiUnlock } from 'react-icons/fi';
import { FaBluesky } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { useOs } from '@mantine/hooks';
import CardFilters from '@/features/cards/components/cardFilters/CardFilters';
import CardSortSelect from '@/features/cards/components/cardFilters/CardSortSelect';
import CardTypeFilter from '@/features/cards/components/cardFilters/CardTypeFilter';
import CardViewToggle from '@/features/cards/components/cardFilters/CardViewToggle';
import useGemCollectionSearch from '../../lib/queries/useGemCollectionSearch';
import { CollectionAccessType } from '@semble/types';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainer(props: Props) {
  const os = useOs();
  const { user } = useAuth();
  const { data: featureFlags } = useFeatureFlags();
  const { data, isPending, error } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const firstPage = data.pages[0];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data: searchResults, isLoading: isLoadingSearchResults } =
    useGemCollectionSearch();

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
            <Group gap="xs">
              <Text fw={700} c="grape">
                Collection
              </Text>
              {featureFlags?.openCollections && firstPage.accessType && (
                <Badge
                  variant="light"
                  color={firstPage.accessType === CollectionAccessType.OPEN ? "teal" : "gray"}
                  leftSection={
                    firstPage.accessType === CollectionAccessType.OPEN ? (
                      <FiUnlock size={12} />
                    ) : (
                      <FiLock size={12} />
                    )
                  }
                  size="sm"
                >
                  {firstPage.accessType === CollectionAccessType.OPEN ? "Open" : "Closed"}
                </Badge>
              )}
            </Group>
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
                src={firstPage.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
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

        <Group justify="space-between">
          <CardFilters>
            <CardSortSelect />
            <CardTypeFilter />
            <CardViewToggle />
          </CardFilters>

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
            accessType={firstPage.accessType}
            authorHandle={firstPage.author.handle}
          />
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
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
