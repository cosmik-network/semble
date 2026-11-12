'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TfiBlackboard } from 'react-icons/tfi';
import { seededCanvasHref } from '../../lib/constants';

export default function OpenInCanvasHeaderButton() {
  const searchParams = useSearchParams();
  const url = searchParams.get('id');

  if (!url) return null;

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
        <TfiBlackboard />
      </ActionIcon>
    </Tooltip>
  );
}
