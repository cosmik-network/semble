'use client';

import { Anchor } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import useCardCandidates from '../../lib/queries/useCardCandidates';
import CardScroller from '../cardScroller/CardScroller';
import CardScrollerSkeleton from '../cardScroller/Skeleton.CardScroller';
import TaskPanel from '../taskPanel/TaskPanel';

interface Props {
  /** Opens the Composer, for saving something that is not on the row. */
  onSaveOwnLink: () => void;
}

/** What the "Save a card" tile opens. */
export default function SaveTileCards(props: Props) {
  const { candidates, isPending } = useCardCandidates();

  return (
    <TaskPanel
      title="Start your library"
      subtitle={
        <>
          Cards from the topics you picked, or{' '}
          {/* `baseline` because a <button> sits on `vertical-align: middle` and
              would ride visibly high in a sentence. */}
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
      {/* The header depends on no query, so only the row below waits. */}
      {isPending ? (
        <CardScrollerSkeleton />
      ) : (
        candidates.length > 0 && (
          <CardScroller>
            {candidates.map((view, index) => (
              <UrlCard
                key={view.url}
                // A recommendation has no card id, so the URL stands in — as
                // SimilarUrlCard already does it.
                id={view.url}
                url={view.url}
                cardContent={view.metadata}
                urlLibraryCount={view.urlLibraryCount}
                urlIsInLibrary={view.urlInLibrary ?? false}
                urlConnectionCount={view.urlConnectionCount ?? 0}
                urlIsConnected={view.urlIsConnected}
                // The first card only — passed bare it would pin a tooltip to
                // every card in the row.
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
