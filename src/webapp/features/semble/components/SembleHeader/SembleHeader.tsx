import { Stack, Grid } from '@mantine/core';
import UrlAddedBySummary from '../urlAddedBySummary/UrlAddedBySummary';
import { Suspense } from 'react';
import SembleActionsContainerSkeleton from '../../containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import SembleActionsContainer from '../../containers/sembleActionsContainer/SembleActionsContainer';
import UrlMetadataHeader from '../urlMetadataHeader/UrlMetadataHeader';
import UrlAddedBySummarySkeleton from '../urlAddedBySummary/Skeleton.UrlAddedBySummary';

interface Props {
  url: string;
  viaCardId?: string;
}

export default async function SembleHeader(props: Props) {
  return (
    <Stack gap={'xl'}>
      <UrlMetadataHeader url={props.url}>
        <Stack align="center">
          <Suspense fallback={<SembleActionsContainerSkeleton />}>
            <SembleActionsContainer
              url={props.url}
              viaCardId={props.viaCardId}
            />
          </Suspense>
        </Stack>
      </UrlMetadataHeader>

      <Suspense fallback={<UrlAddedBySummarySkeleton />}>
        <UrlAddedBySummary url={props.url} />
      </Suspense>
    </Stack>
  );
}
