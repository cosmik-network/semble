import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import BoardCanvas from '@/features/canvas/containers/boardCanvas/BoardCanvas';

export default function Page() {
  return (
    <Suspense
      fallback={
        <Center h="100dvh">
          <Loader />
        </Center>
      }
    >
      <BoardCanvas />
    </Suspense>
  );
}
