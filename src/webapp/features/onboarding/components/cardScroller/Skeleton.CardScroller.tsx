import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import CardScroller from './CardScroller';

/** More than fills the widest the panel gets at CardScroller's card width. */
const PLACEHOLDER_CARDS = 4;

/** The real CardScroller, so nothing shifts when the cards land. */
export default function CardScrollerSkeleton() {
  return (
    <CardScroller>
      {Array.from({ length: PLACEHOLDER_CARDS }).map((_, index) => (
        <UrlCardSkeleton key={index} />
      ))}
    </CardScroller>
  );
}
