import { Container, Stack } from '@mantine/core';
import LibraryRecentCardsSkeleton from '../../components/libraryRecentCards/Skeleton.LibraryRecentCards';
import LibraryRecentCollectionsSkeleton from '../../components/libraryRecentCollections/Skeleton.LibraryRecentCollections';
import LibraryRecommendationsSkeleton from '../../components/libraryRecommendations/Skeleton.LibraryRecommendations';

export default function LibraryContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Stack gap={50}>
          <LibraryRecommendationsSkeleton />
          <LibraryRecentCollectionsSkeleton />
          <LibraryRecentCardsSkeleton />
        </Stack>
      </Stack>
    </Container>
  );
}
