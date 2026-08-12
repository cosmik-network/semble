'use client';

import { Anchor } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import useCardCandidates from '../../lib/queries/useCardCandidates';
import CardScroller from '../cardScroller/CardScroller';
import CardScrollerSkeleton from '../cardScroller/Skeleton.CardScroller';
import TaskPanel from '../taskPanel/TaskPanel';

interface Props {
  onSaveOwnLink: () => void;
}

export default function SaveTileCards(props: Props) {
  const { candidates, isPending } = useCardCandidates();

  return (
    <TaskPanel
      title="Start your library"
      subtitle={
        <>
          Cards from the topics you picked, or{' '}
          <Anchor
            component="button"
            type="button"
            fz={'sm'}
            fw={600}
            underline="never"
            onClick={props.onSaveOwnLink}
            style={{ verticalAlign: 'baseline' }}
          >
            add a link of your own
          </Anchor>
        </>
      }
    >
      {isPending ? (
        <CardScrollerSkeleton />
      ) : (
        candidates.length > 0 && (
          <CardScroller>
            {candidates.map((view, index) => (
              <UrlCard
                key={view.url}
                id={view.url}
                url={view.url}
                cardContent={view.metadata}
                urlLibraryCount={view.urlLibraryCount}
                urlIsInLibrary={view.urlInLibrary ?? false}
                urlConnectionCount={view.urlConnectionCount ?? 0}
                urlIsConnected={view.urlIsConnected}
                saveTooltipOpen={index === 0}
                analyticsContext={{
                  saveSource: CardSaveSource.ONBOARDING,
                  pagePath: '/onboarding',
                }}
              />
            ))}
          </CardScroller>
        )
      )}
    </TaskPanel>
  );
}
