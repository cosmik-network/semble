'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BsEasel } from 'react-icons/bs';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { seededCanvasHref } from '../../lib/constants';

export default function OpenInCanvasHeaderButton() {
  const searchParams = useSearchParams();
  const { data: featureFlags } = useFeatureFlags();
  // The server has no feature flags, and the client may already have them
  // when this hydrates
  const mounted = useMounted();
  const url = searchParams.get('id');

  if (!url || !mounted || !featureFlags?.canvas) return null;

  return (
    <Tooltip label="Open in canvas" withArrow position="top">
      <ActionIcon
        component={Link}
        href={seededCanvasHref({ url })}
        prefetch={false}
        variant="light"
        color="gray"
        size={36}
        radius="xl"
        aria-label="Open in canvas"
      >
        <BsEasel />
      </ActionIcon>
    </Tooltip>
  );
}
