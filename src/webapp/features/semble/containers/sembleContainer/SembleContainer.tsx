import SembleHeader from '../../components/SembleHeader/SembleHeader';
import { Box, Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import SembleTabs from '../../components/sembleTabs/SembleTabs';
import SembleHeaderSkeleton from '../../components/SembleHeader/Skeleton.SembleHeader';
import SembleHeaderBackground from './SembleHeaderBackground';
import BlueskySembleHeader from '@/features/platforms/bluesky/container/blueskySembleHeader/BlueskySembleHeader';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import BlueskySembleHeaderSkeleton from '@/features/platforms/bluesky/container/blueskySembleHeader/Skeleton.BlueskySembleHeader';

interface Props {
  url: string;
  viaCardId?: string;
}

export default function SembleContainer(props: Props) {
  const platform = detectUrlPlatform(props.url);

  return (
    <Container p={0} fluid>
      <SembleHeaderBackground />
      <Container px={'xs'} pb={'xs'} size={'xl'}>
        <Stack gap={'xl'}>
          {platform.type === SupportedPlatform.BLUESKY_POST ||
          platform.type === SupportedPlatform.BLACKSKY_POST ? (
            <Box maw={600} w={'100%'} mx={'auto'}>
              <Suspense
                fallback={<BlueskySembleHeaderSkeleton />}
                key={props.url + 'bluesky header'}
              >
                <BlueskySembleHeader
                  url={props.url}
                  viaCardId={props.viaCardId}
                />
              </Suspense>
            </Box>
          ) : (
            <Suspense
              fallback={<SembleHeaderSkeleton />}
              key={props.url + 'semble header'}
            >
              <SembleHeader url={props.url} viaCardId={props.viaCardId} />
            </Suspense>
          )}
          <SembleTabs url={props.url} />
        </Stack>
      </Container>
    </Container>
  );
}
