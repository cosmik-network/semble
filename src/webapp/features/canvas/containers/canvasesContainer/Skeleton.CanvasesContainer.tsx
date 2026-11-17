import { Container, SimpleGrid } from '@mantine/core';
import CanvasCardSkeleton from '../../components/canvasCard/Skeleton.CanvasCard';
import NewCanvasCard from '../../components/newCanvasCard/NewCanvasCard';

export default function CanvasesContainerSkeleton() {
  return (
    <Container p={'xs'} size={'xl'}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={'xs'}>
        <NewCanvasCard />
        {Array.from({ length: 2 }, (_, i) => (
          <CanvasCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
