'use client';

import { Stack } from '@mantine/core';
import useCards from '@/features/cards/lib/queries/useCards';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { LinkAnchor } from '@/components/link/MantineLink';
import { CardSaveSource } from '@/features/analytics/types';

const VISIBLE_CARDS = 4;

interface Props {
  handle: string;
}

export default function ConnectTileCards(props: Props) {
  const cards = useCards({ didOrHandle: props.handle, limit: VISIBLE_CARDS });

  const visible =
    cards.data?.pages.flatMap((page) => page.cards).slice(0, VISIBLE_CARDS) ??
    [];

  return (
    <Stack gap={'xs'}>
      {visible.map((card) => (
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
          connectTooltipOpen
          analyticsContext={{
            saveSource: CardSaveSource.ONBOARDING,
            pagePath: '/onboarding',
          }}
        />
      ))}

      <LinkAnchor href={`/profile/${props.handle}/cards`} fz={'sm'}>
        See all your cards
      </LinkAnchor>
    </Stack>
  );
}
