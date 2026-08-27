import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import ExploreScroller from '../exploreScroller/ExploreScroller';

export default function ExploreCardsSkeleton() {
  return (
    <ExploreShelf section="cards">
      <ExploreScroller>
        {Array.from({ length: 6 }).map((_, i) => (
          <UrlCardSkeleton key={i} />
        ))}
      </ExploreScroller>
    </ExploreShelf>
  );
}
