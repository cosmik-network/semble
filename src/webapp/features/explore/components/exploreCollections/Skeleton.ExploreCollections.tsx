import { Stack } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller, {
  COLLECTION_TILE_WIDTH,
} from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';

export function ExploreCollectionsListSkeleton() {
  return (
    <ExploreScroller itemWidth={COLLECTION_TILE_WIDTH}>
      {Array.from({ length: 4 }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </ExploreScroller>
  );
}

export default function ExploreCollectionsSkeleton() {
  return (
    <Stack>
      <ExploreSectionHeader
        icon={<BiCollection size={22} />}
        title="Collections"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.collections}
      />
      <ExploreCollectionsListSkeleton />
    </Stack>
  );
}
