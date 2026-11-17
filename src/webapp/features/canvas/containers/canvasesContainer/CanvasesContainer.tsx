'use client';

import { Container, SimpleGrid } from '@mantine/core';
import useCanvases from '../../lib/queries/useCanvases';
import CanvasCard from '../../components/canvasCard/CanvasCard';
import CanvasesContainerSkeleton from './Skeleton.CanvasesContainer';
import NewCanvasCard from '../../components/newCanvasCard/NewCanvasCard';

export default function CanvasesContainer() {
  const { data: canvases, error } = useCanvases();
  if (error) throw error;
  if (!canvases) return <CanvasesContainerSkeleton />;

  return (
    <Container p={'xs'} size={'xl'}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={'xs'}>
        <NewCanvasCard />
        {canvases.map((canvas) => (
          <CanvasCard key={canvas.id} canvas={canvas} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
