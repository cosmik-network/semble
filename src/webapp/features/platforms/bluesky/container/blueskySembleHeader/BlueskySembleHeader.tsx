import UrlAddedBySummary from '@/features/semble/components/urlAddedBySummary/UrlAddedBySummary';
import { Stack } from '@mantine/core';
import SembleActionsContainer from '@/features/semble/containers/sembleActionsContainer/SembleActionsContainer';
import { Suspense } from 'react';
import SembleActionsContainerSkeleton from '@/features/semble/containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import BlueskySemblePost from '../../components/blueskySemblePost/BlueskySemblePost';
import BlueskySemblePostSkeleton from '../../components/blueskySemblePost/Skeleton.BlueskySemblePost';
import UrlAddedBySummarySkeleton from '@/features/semble/components/urlAddedBySummary/Skeleton.UrlAddedBySummary';

interface Props {
  url: string;
  viaCardId?: string;
}

export default async function BlueskySembleHeader(props: Props) {
  return (
    <Stack gap={'sm'} mx={'auto'} w={'100%'}>
      <Suspense fallback={<BlueskySemblePostSkeleton />}>
        <BlueskySemblePost url={props.url} />
      </Suspense>

      <Stack align="center">
        <Suspense fallback={<SembleActionsContainerSkeleton />}>
          <SembleActionsContainer url={props.url} viaCardId={props.viaCardId} />
        </Suspense>
      </Stack>

      <Suspense fallback={<UrlAddedBySummarySkeleton />}>
        <UrlAddedBySummary url={props.url} />
      </Suspense>
    </Stack>
  );
}
