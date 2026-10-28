'use client';

import { Container, SimpleGrid } from '@mantine/core';
import useCanvases from '../../lib/queries/useCanvases';
import CanvasCard from '../../components/canvasCard/CanvasCard';
import CanvasCardSkeleton from '../../components/canvasCard/Skeleton.CanvasCard';
import NewCanvasCard from '../../components/newCanvasCard/NewCanvasCard';

export default function CanvasesContainer() {
  const { data: canvases, error } = useCanvases();
  if (error) throw error;

  return (
    <Container p={'xs'} size={'xl'}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={'xs'}>
        <NewCanvasCard />
        {canvases
          ? canvases.map((canvas) => (
              <CanvasCard key={canvas.id} canvas={canvas} />
            ))
          : Array.from({ length: 2 }, (_, i) => <CanvasCardSkeleton key={i} />)}
      </SimpleGrid>
    </Container>
  );
}
