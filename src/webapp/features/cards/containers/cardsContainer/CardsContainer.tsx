import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';

interface Props {
  handle: string;
}

export default function CardsContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
