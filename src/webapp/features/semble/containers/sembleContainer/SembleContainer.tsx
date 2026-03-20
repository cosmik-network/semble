import SembleHeader from '../../components/SembleHeader/SembleHeader';
import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import SembleTabs from '../../components/sembleTabs/SembleTabs';
import SembleHeaderSkeleton from '../../components/SembleHeader/Skeleton.SembleHeader';
import SembleHeaderBackground from './SembleHeaderBackground';
import BlueskySembleHeader from '@/features/platforms/bluesky/container/blueskySembleHeader/BlueskySembleHeader';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import BlueskySembleHeaderSkeleton from '@/features/platforms/bluesky/container/blueskySembleHeader/Skeleton.BlueskySembleHeader';
import React from 'react';

interface Props {
  url: string;
  viaCardId?: string;
}

type PlatformEntry = {
  component: React.ComponentType<{ url: string; viaCardId?: string }>;
  skeleton: React.ComponentType;
};

const PLATFORM_REGISTRY: Partial<Record<SupportedPlatform, PlatformEntry>> = {
  [SupportedPlatform.BLUESKY_POST]: {
    component: BlueskySembleHeader,
    skeleton: BlueskySembleHeaderSkeleton,
  },
  [SupportedPlatform.BLACKSKY_POST]: {
    component: BlueskySembleHeader,
    skeleton: BlueskySembleHeaderSkeleton,
  },
};

const DEFAULT_ENTRY: PlatformEntry = {
  component: SembleHeader,
  skeleton: SembleHeaderSkeleton,
};

export default function SembleContainer(props: Props) {
  const platform = detectUrlPlatform(props.url);
  const { component: HeaderComponent, skeleton: SkeletonComponent } =
    PLATFORM_REGISTRY[platform.type] ?? DEFAULT_ENTRY;

  return (
    <Container p={0} fluid>
      <SembleHeaderBackground />
      <Container px={'xs'} pb={'xs'} size={'xl'}>
        <Stack gap={'xl'}>
          <Suspense fallback={<SkeletonComponent />} key={props.url + 'header'}>
            <HeaderComponent url={props.url} viaCardId={props.viaCardId} />
          </Suspense>

          <SembleTabs url={props.url} />
        </Stack>
      </Container>
    </Container>
  );
}
