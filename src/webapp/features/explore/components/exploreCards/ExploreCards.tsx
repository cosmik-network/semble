'use client';

import { usePathname } from 'next/navigation';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import ExploreShelfEmpty from '../exploreShelfEmpty/ExploreShelfEmpty';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { useCardShelf } from '../../lib/useCardShelf';
import RefreshButton from '../refreshButton/RefreshButton';
import ExploreCardsSkeleton from './Skeleton.ExploreCards';
import ExploreCardsError from './Error.ExploreCards';

export default function ExploreCards() {
  const pathname = usePathname();
  const shelf = useCardShelf();

  if (shelf.isPending) return <ExploreCardsSkeleton />;

  return (
    <ExploreShelf
      section="cards"
      actions={
        <RefreshButton
          onRefresh={shelf.refresh}
          isRefreshing={shelf.isRefreshing}
          label="Show different cards"
        />
      }
    >
      {shelf.hasFailed ? (
        <ExploreCardsError />
      ) : shelf.urls.length === 0 ? (
        <ExploreShelfEmpty message="No recommendations yet" />
      ) : (
        <ExploreScroller
          key={shelf.shown}
          animateOnMount={shelf.shuffled}
          dimmed={shelf.isRefreshing}
        >
          {shelf.urls.map((urlView) => (
            <SimilarUrlCard
              key={urlView.url}
              urlView={urlView}
              analyticsContext={{
                saveSource: CardSaveSource.RECOMMENDED,
                pagePath: pathname,
              }}
            />
          ))}
        </ExploreScroller>
      )}
    </ExploreShelf>
  );
}
