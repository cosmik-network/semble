'use client';

import { useMyCardsInfinite } from '../../lib/queries/useMyCards';
import { NAV_CARDS_LIMIT } from '../../lib/constants';
import LibraryNavSectionSkeleton from '@/features/library/components/libraryNav/Skeleton.LibraryNavSection';
import CardNavItem from './CardNavItem';

export default function MyCardsNavItems() {
  const { data, error, isPending } = useMyCardsInfinite({
    limit: NAV_CARDS_LIMIT,
  });

  if (error) throw error;
  if (isPending) return <LibraryNavSectionSkeleton />;

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
