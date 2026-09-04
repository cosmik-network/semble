import StatChipCard from '@/components/statChip/StatChipCard';
import StatChipSkeleton from '@/components/statChip/Skeleton.StatChip';

export default function CollectionStatsSkeleton() {
  return (
    <StatChipCard grow>
      <StatChipSkeleton width={90} />
      <StatChipSkeleton width={84} />
    </StatChipCard>
  );
}
