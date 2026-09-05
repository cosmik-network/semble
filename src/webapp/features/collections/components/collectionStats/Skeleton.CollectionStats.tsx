import { CollectionAccessType } from '@semble/types';
import StatChipCard from '@/components/statChip/StatChipCard';
import StatChipSkeleton from '@/components/statChip/Skeleton.StatChip';

interface Props {
  accessType?: CollectionAccessType;
}

export default function CollectionStatsSkeleton(props: Props) {
  return (
    <StatChipCard grow>
      <StatChipSkeleton width={90} />
      <StatChipSkeleton width={84} />
      {props.accessType === CollectionAccessType.OPEN && (
        <StatChipSkeleton width={104} />
      )}
    </StatChipCard>
  );
}
