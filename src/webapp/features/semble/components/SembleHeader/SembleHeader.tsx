import { Stack, Grid, GridCol } from '@mantine/core';
import UrlAddedBySummary from '../urlAddedBySummary/UrlAddedBySummary';
import { Suspense } from 'react';
import SembleActionsContainerSkeleton from '../../containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import SembleActionsContainer from '../../containers/sembleActionsContainer/SembleActionsContainer';
import UrlMetadataHeader from '../urlMetadataHeader/UrlMetadataHeader';
import UrlMetadataHeaderSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataHeader';
import UrlAddedBySummarySkeleton from '../urlAddedBySummary/Skeleton.UrlAddedBySummary';
import UrlMetadataImage from '../urlMetadataHeader/UrlMetadataImage';
import UrlMetadataImageSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataImage';

interface Props {
  url: string;
  viaCardId?: string;
}

export default function SembleHeader(props: Props) {
  return (
    <Stack gap={'xl'}>
      <Grid gutter="lg" justify="space-between">
        <GridCol span={{ base: 'auto' }}>
          <Suspense fallback={<UrlMetadataHeaderSkeleton />}>
            <UrlMetadataHeader url={props.url} />
          </Suspense>
        </GridCol>
        <GridCol span={{ base: 12, sm: 'content' }}>
          <Stack gap={'sm'} align="center">
            <Suspense fallback={<UrlMetadataImageSkeleton />}>
              <UrlMetadataImage url={props.url} />
            </Suspense>
            <Suspense fallback={<SembleActionsContainerSkeleton />}>
              <SembleActionsContainer
                url={props.url}
                viaCardId={props.viaCardId}
              />
            </Suspense>
          </Stack>
        </GridCol>
      </Grid>

      <Suspense fallback={<UrlAddedBySummarySkeleton />}>
        <UrlAddedBySummary url={props.url} />
      </Suspense>
    </Stack>
  );
}
