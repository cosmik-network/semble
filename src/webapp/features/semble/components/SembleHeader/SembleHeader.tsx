import { Stack, Grid, GridCol } from '@mantine/core';
import SembleStats from '../sembleStats/SembleStats';
import { Suspense } from 'react';
import SembleActionsContainerSkeleton from '../../containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import SembleActionsContainer from '../../containers/sembleActionsContainer/SembleActionsContainer';
import UrlMetadataHeader from '../urlMetadataHeader/UrlMetadataHeader';
import UrlMetadataHeaderSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataHeader';
import SembleStatsSkeleton from '../sembleStats/Skeleton.SembleStats';
import UrlMetadataImage from '../urlMetadataHeader/UrlMetadataImage';
import UrlMetadataImageSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataImage';
import SembleHeaderMedia from './SembleHeaderMedia';

interface Props {
  url: string;
  viaCardId?: string;
  hideActions?: boolean;
}

export default function SembleHeader(props: Props) {
  return (
    <Stack gap={'lg'}>
      <Grid gap="lg" justify="space-between">
        <GridCol span={{ base: 'auto' }}>
          <Suspense fallback={<UrlMetadataHeaderSkeleton />} key={props.url}>
            <UrlMetadataHeader url={props.url} />
          </Suspense>
        </GridCol>
        <GridCol span={{ base: 12, sm: 'content' }}>
          <Stack gap={'sm'} align="center">
            <SembleHeaderMedia url={props.url}>
              <Suspense fallback={<UrlMetadataImageSkeleton />} key={props.url}>
                <UrlMetadataImage url={props.url} />
              </Suspense>
            </SembleHeaderMedia>
            {!props.hideActions && (
              <Suspense
                fallback={<SembleActionsContainerSkeleton />}
                key={props.url + 'semble actions container'}
              >
                <SembleActionsContainer
                  url={props.url}
                  viaCardId={props.viaCardId}
                />
              </Suspense>
            )}
          </Stack>
        </GridCol>
      </Grid>

      <Suspense fallback={<SembleStatsSkeleton />} key={props.url}>
        <SembleStats url={props.url} />
      </Suspense>
    </Stack>
  );
}
