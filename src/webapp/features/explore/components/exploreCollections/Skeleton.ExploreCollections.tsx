import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import ExploreScroller, {
  COLLECTION_TILE_WIDTH,
} from '../exploreScroller/ExploreScroller';

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
    <ExploreShelf section="collections">
      <ExploreCollectionsListSkeleton />
    </ExploreShelf>
  );
}
