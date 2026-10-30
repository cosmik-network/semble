'use client';

import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import Link from 'next/link';
import { Suspense } from 'react';
import { BsEasel } from 'react-icons/bs';
import { FiPlus } from 'react-icons/fi';
import useCollection from '@/features/collections/lib/queries/useCollection';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import {
  RECENT_CANVASES_LIMIT,
  canvasHref,
  seededCanvasHref,
} from '../../lib/constants';
import useCanvases from '../../lib/queries/useCanvases';

interface Props {
  handle: string;
  rkey: string;
}

// Starts a new board from the collection, or adds it to a recent one
export default function OpenCollectionInCanvasButton(props: Props) {
  const { data: featureFlags } = useFeatureFlags();
  // The server has no feature flags, and the client may already have them
  // when this hydrates
  const mounted = useMounted();

  if (!mounted || !featureFlags?.canvas) return null;

  return (
    <Suspense fallback={null}>
      <OpenInCanvasMenu handle={props.handle} rkey={props.rkey} />
    </Suspense>
  );
}

// Apart, so boards are only listed for those with the flag
function OpenInCanvasMenu(props: Props) {
  const { data: canvases } = useCanvases();
  // The query the collection's header has already loaded
  const { data } = useCollection({ rkey: props.rkey, handle: props.handle });
  const seed = { collectionId: data.pages[0].id };
  const recent = (canvases ?? []).slice(0, RECENT_CANVASES_LIMIT);

  return (
    <Menu position="bottom-end" shadow="sm" withinPortal>
      <Menu.Target>
        <Tooltip label="Open in canvas" withArrow position="top">
          <ActionIcon
            variant="light"
            color="gray"
            size={36}
            radius="xl"
            aria-label="Open in canvas"
          >
            <BsEasel />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          href={seededCanvasHref(seed)}
          prefetch={false}
          leftSection={<FiPlus />}
        >
          New canvas
        </Menu.Item>
        {recent.length > 0 && (
          <>
            <Menu.Divider />
            <Menu.Label>Add to a canvas</Menu.Label>
            {recent.map((canvas) => (
              <Menu.Item
                key={canvas.id}
                component={Link}
                href={canvasHref(canvas.id, seed)}
                prefetch={false}
              >
                {canvas.name}
              </Menu.Item>
            ))}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
