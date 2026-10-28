'use client';

import dynamic from 'next/dynamic';
import { Center, Loader } from '@mantine/core';

// Loaded on demand so tldraw stays out of every other page's bundle. tldraw
// touches window on import, so it never renders on the server.
const BoardEditor = dynamic(() => import('../boardEditor/BoardEditor'), {
  ssr: false,
  loading: () => (
    <Center h="100dvh">
      <Loader />
    </Center>
  ),
});

interface Props {
  canvasId: string;
}

export default function CanvasBoard(props: Props) {
  // Keyed so another board gets a fresh editor instead of the last one's shapes
  return <BoardEditor key={props.canvasId} canvasId={props.canvasId} />;
}
