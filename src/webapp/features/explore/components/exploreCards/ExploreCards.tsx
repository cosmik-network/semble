'use client';

import { Stack, Text } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { FaRegNoteSticky } from 'react-icons/fa6';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
import { useCardShelf } from '../../lib/useCardShelf';
import RefreshButton from '../refreshButton/RefreshButton';
import ExploreCardsSkeleton from './Skeleton.ExploreCards';
import ExploreCardsError from './Error.ExploreCards';

export default function ExploreCards() {
  const pathname = usePathname();
  const shelf = useCardShelf();

  if (shelf.isPending) return <ExploreCardsSkeleton />;

  return (
    <Stack>
      <ExploreSectionHeader
        icon={<FaRegNoteSticky size={22} />}
        title="Cards"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.cards}
        actions={
          <RefreshButton
            onRefresh={shelf.refresh}
            isRefreshing={shelf.isRefreshing}
            subject="cards"
          />
        }
      />

      {shelf.hasFailed ? (
        <ExploreCardsError />
      ) : shelf.urls.length > 0 ? (
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
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No recommendations yet
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
