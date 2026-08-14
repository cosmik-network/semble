import { Card } from '@mantine/core';
import UrlCardContentSkeleton from '@/features/cards/components/urlCardContent/Skeleton.UrlCardContent';

export default function OnboardingUrlCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'} h={'100%'}>
      <UrlCardContentSkeleton />
    </Card>
  );
}
