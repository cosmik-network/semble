'use client';

import { Stack, Text } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { FaRegNoteSticky } from 'react-icons/fa6';
import type { UrlView } from '@/api-client';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
import RefreshButton from '../refreshButton/RefreshButton';
import ExploreCardsSkeleton from './Skeleton.ExploreCards';

interface Props {
  urls: UrlView[];
  isPending: boolean;
  /** A new set is in flight; the previous cards stay on screen. */
  isRefreshing: boolean;
  dealKey: number;
  onRefresh: () => void;
}

export default function ExploreCards(props: Props) {
  const pathname = usePathname();

  if (props.isPending) return <ExploreCardsSkeleton />;

  return (
    <Stack>
      <ExploreSectionHeader
        icon={<FaRegNoteSticky size={22} />}
        title="Cards"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.cards}
        actions={
          <RefreshButton
            onRefresh={props.onRefresh}
            isRefreshing={props.isRefreshing}
            subject="cards"
          />
        }
      />

      {props.urls.length > 0 ? (
        <ExploreScroller dealKey={props.dealKey} dimmed={props.isRefreshing}>
          {props.urls.map((urlView) => (
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
