'use client';

import dynamic from 'next/dynamic';
import { Center, Loader } from '@mantine/core';

// tldraw touches window on import, so it never renders on the server
const LazyCanvasEditor = dynamic(() => import('./CanvasEditor'), {
  ssr: false,
  loading: () => (
    <Center h="100dvh">
      <Loader />
    </Center>
  ),
});

export default LazyCanvasEditor;
