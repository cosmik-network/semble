'use client';

import useMyCards from '../../lib/queries/useMyCards';
import { NAV_CARDS_LIMIT } from '../../lib/constants';
import CardNavItem from './CardNavItem';

export default function MyCardsNavItems() {
  const { data } = useMyCards({ limit: NAV_CARDS_LIMIT });
  const cards = data.pages.flatMap((page) => page.cards ?? []);

  return (
    <>
      {cards.map((card) => (
        <CardNavItem
          key={card.id}
          url={card.url}
          title={card.cardContent.title}
          imageUrl={card.cardContent.imageUrl}
        />
      ))}
    </>
  );
}
