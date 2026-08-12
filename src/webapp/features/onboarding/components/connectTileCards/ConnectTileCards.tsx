'use client';

import { Suspense } from 'react';
import useCards from '@/features/cards/lib/queries/useCards';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import useCardCandidates from '../../lib/queries/useCardCandidates';
import CardScroller from '../cardScroller/CardScroller';
import CardScrollerSkeleton from '../cardScroller/Skeleton.CardScroller';
import TaskPanel from '../taskPanel/TaskPanel';

/** The same length as the save panel's row. */
const VISIBLE_CARDS = 10;

interface Props {
  handle: string;
}

/**
 * `useCards` is a suspense query, so the boundary sits below the header —
 * above it, the title and subtitle would suspend with the cards.
 */
export default function ConnectTileCards(props: Props) {
  return (
    <TaskPanel
      title="Pick a card to connect"
      subtitle="Then choose what it relates to, and why"
    >
      <Suspense fallback={<CardScrollerSkeleton />}>
        <ConnectRow handle={props.handle} />
      </Suspense>
    </TaskPanel>
  );
}

/**
 * Your own cards lead, then the same candidates the save panel offers — a
 * connection is between two URLs and neither has to be saved.
 */
function ConnectRow(props: Props) {
  const cards = useCards({ didOrHandle: props.handle, limit: VISIBLE_CARDS });
  const { candidates, isPending } = useCardCandidates();

  const own =
    cards.data?.pages.flatMap((page) => page.cards).slice(0, VISIBLE_CARDS) ??
    [];

  // A pick from the card stage that has since been saved is in both lists.
  const ownUrls = new Set(own.map((card) => card.url));
  const fill = candidates
    .filter((view) => !ownUrls.has(view.url))
    .slice(0, VISIBLE_CARDS - own.length);

  // The same placeholders the boundary above uses, so the two waits read as
  // one.
  if (own.length === 0 && isPending) {
    return <CardScrollerSkeleton />;
  }

  return (
    own.length + fill.length > 0 && (
      <CardScroller>
        {own.map((card, index) => (
          <UrlCard
            key={card.id}
            id={card.id}
            url={card.url}
            uri={card.uri}
            cardContent={card.cardContent}
            note={card.note}
            authorHandle={props.handle}
            cardAuthor={card.author}
            urlLibraryCount={card.urlLibraryCount}
            urlIsInLibrary={card.urlInLibrary}
            urlConnectionCount={card.urlConnectionCount ?? 0}
            urlIsConnected={card.urlIsConnected}
            viaCardId={card.id}
            // The first card only, or every card in the row pins a tooltip.
            connectTooltipOpen={index === 0}
            analyticsContext={{
              saveSource: CardSaveSource.ONBOARDING,
              pagePath: '/onboarding',
            }}
          />
        ))}

        {fill.map((view, index) => (
          <UrlCard
            key={view.url}
            // A recommendation has no card id, so the URL stands in.
            id={view.url}
            url={view.url}
            cardContent={view.metadata}
            urlLibraryCount={view.urlLibraryCount}
            urlIsInLibrary={view.urlInLibrary ?? false}
            urlConnectionCount={view.urlConnectionCount ?? 0}
            urlIsConnected={view.urlIsConnected}
            // This list is first in the row only when the user has no cards.
            connectTooltipOpen={index === 0 && own.length === 0}
            analyticsContext={{
              saveSource: CardSaveSource.ONBOARDING,
              pagePath: '/onboarding',
            }}
          />
        ))}
      </CardScroller>
    )
  );
}
