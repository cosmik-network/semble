import { Container, Skeleton, Stack } from '@mantine/core';

export default function CollectionGalleryEmbedContainerSkeleton() {
  return (
    <Container p={0} fluid h="100svh" style={{ overflow: 'hidden' }}>
      <Stack h={'100%'} gap={'xs'} align="center">
        <Skeleton w={'100%'} h={'100%'} radius={0} />
      </Stack>
    </Container>
  );
}
