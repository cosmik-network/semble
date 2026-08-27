'use client';

import { SimpleGrid } from '@mantine/core';
import type { CollectionDTO } from '@semble/types';
import { BiCollection } from 'react-icons/bi';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { useSettings } from '@/providers/settings';
import ExploreCollectionsContainerError from '../exploreCollectionsContainer/Error.ExploreCollectionsContainer';
import ExploreCollectionsRecommendedContentSkeleton from './Skeleton.ExploreCollectionsRecommendedContent';

interface Props {
  collections: CollectionDTO[];
  isPending: boolean;
  isRefreshing: boolean;
  error: Error | null;
}

export default function ExploreCollectionsRecommendedContent(props: Props) {
  const { settings } = useSettings();

  if (props.isPending) {
    return <ExploreCollectionsRecommendedContentSkeleton />;
  }

  if (props.error) {
    return <ExploreCollectionsContainerError />;
  }

  if (props.collections.length === 0) {
    return (
      <EmptyState message="No collections to suggest yet" icon={BiCollection} />
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 3 }
      }
      spacing="xs"
      style={{
        opacity: props.isRefreshing ? 0.5 : 1,
        pointerEvents: props.isRefreshing ? 'none' : undefined,
      }}
    >
      {props.collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          showAuthor
        />
      ))}
    </SimpleGrid>
  );
}
