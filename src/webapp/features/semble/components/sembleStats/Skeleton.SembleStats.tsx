import StatChipCard from '@/components/statChip/StatChipCard';
import StatChipSkeleton from '@/components/statChip/Skeleton.StatChip';

export default function SembleStatsSkeleton() {
  return (
    <StatChipCard>
      <StatChipSkeleton width={150} />
    </StatChipCard>
  );
}
