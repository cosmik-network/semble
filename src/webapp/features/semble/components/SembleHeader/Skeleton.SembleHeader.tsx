import { Stack, Grid, GridCol, Skeleton } from '@mantine/core';
import SembleStatsSkeleton from '../sembleStats/Skeleton.SembleStats';
import SembleActionsContainerSkeleton from '../../containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import UrlMetadataHeaderSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataHeader';
import UrlMetadataImageSkeleton from '../urlMetadataHeader/Skeleton.UrlMetadataImage';

export default function SembleHeaderSkeleton() {
  return (
    <Stack gap={'xl'}>
      <Grid gap={'lg'} justify="space-between">
        <GridCol span={{ base: 'auto' }}>
          <UrlMetadataHeaderSkeleton />
        </GridCol>
        <GridCol span={{ base: 12, sm: 'content' }}>
          <Stack gap={'sm'} align="center" flex={1}>
            <UrlMetadataImageSkeleton />
            <SembleActionsContainerSkeleton />
          </Stack>
        </GridCol>
      </Grid>

      <SembleStatsSkeleton />
    </Stack>
  );
}
