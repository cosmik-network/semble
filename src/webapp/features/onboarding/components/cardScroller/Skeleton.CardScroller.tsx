import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import CardScroller from './CardScroller';

const PLACEHOLDER_CARDS = 4;

export default function CardScrollerSkeleton() {
  return (
    <CardScroller>
      {Array.from({ length: PLACEHOLDER_CARDS }).map((_, index) => (
        <UrlCardSkeleton key={index} />
      ))}
    </CardScroller>
  );
}
