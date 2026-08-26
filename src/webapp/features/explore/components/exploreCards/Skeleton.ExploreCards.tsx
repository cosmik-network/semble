import { Stack } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';

export default function ExploreCardsSkeleton() {
  return (
    <Stack>
      <ExploreSectionHeader
        icon={<FaRegNoteSticky size={22} />}
        title="Cards"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.cards}
      />
      <ExploreScroller>
        {Array.from({ length: 6 }).map((_, i) => (
          <UrlCardSkeleton key={i} />
        ))}
      </ExploreScroller>
    </Stack>
  );
}
