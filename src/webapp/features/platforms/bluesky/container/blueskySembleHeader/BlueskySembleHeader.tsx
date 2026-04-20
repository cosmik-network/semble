import SembleStats from '@/features/semble/components/sembleStats/SembleStats';
import { Stack } from '@mantine/core';
import SembleActionsContainer from '@/features/semble/containers/sembleActionsContainer/SembleActionsContainer';
import { Suspense } from 'react';
import SembleActionsContainerSkeleton from '@/features/semble/containers/sembleActionsContainer/Skeleton.SembleActionsContainer';
import BlueskySemblePost from '../../components/blueskySemblePost/BlueskySemblePost';
import BlueskySemblePostSkeleton from '../../components/blueskySemblePost/Skeleton.BlueskySemblePost';
import SembleStatsSkeleton from '@/features/semble/components/sembleStats/Skeleton.SembleStats';

interface Props {
  url: string;
  viaCardId?: string;
  hideActions?: boolean;
}

export default async function BlueskySembleHeader(props: Props) {
  return (
    <Stack gap={'sm'} mx={'auto'} w={'100%'} maw={600}>
      <Suspense
        fallback={<BlueskySemblePostSkeleton />}
        key={props.url + 'bluesky semble post'}
      >
        <BlueskySemblePost url={props.url} />
      </Suspense>

      <Stack gap={'xl'}>
        {!props.hideActions && (
          <Stack align="center">
            <Suspense
              fallback={<SembleActionsContainerSkeleton />}
              key={props.url + 'semble actions'}
            >
              <SembleActionsContainer
                url={props.url}
                viaCardId={props.viaCardId}
              />
            </Suspense>
          </Stack>
        )}

        <Suspense
          fallback={<SembleStatsSkeleton />}
          key={props.url + 'added by summary'}
        >
          <SembleStats url={props.url} />
        </Suspense>
      </Stack>
    </Stack>
  );
}
