import { Container, Group, Stack, Title } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import LibraryRecommendations from '../../components/libraryRecommendations/LibraryRecommendations';
import { ErrorBoundary } from 'react-error-boundary';
import LibraryRecentCollections from '../../components/libraryRecentCollections/LibraryRecentCollections';
import LibraryRecentCards from '../../components/libraryRecentCards/LibraryRecentCards';
import { Suspense } from 'react';
import LibraryRecommendationsSkeleton from '../../components/libraryRecommendations/Skeleton.LibraryRecommendations';
import LibraryRecentCardsSkeleton from '../../components/libraryRecentCards/Skeleton.LibraryRecentCards';
import LibraryRecentCollectionsSkeleton from '../../components/libraryRecentCollections/Skeleton.LibraryRecentCollections';
import { LinkButton } from '@/components/link/MantineLink';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';

export default function LibraryContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Stack gap={50}>
          <Stack>
            <ErrorBoundary
              fallback={
                <Stack>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <MdOutlineEmojiNature size={22} />
                      <Title order={2}>Discover on Semble</Title>
                    </Group>
                    <LinkButton variant="light" color="blue" href={'/explore'}>
                      View all
                    </LinkButton>
                  </Group>
                  <EmptyState
                    icon={MdOutlineEmojiNature}
                    message="No recent activity to show yet"
                  />
                </Stack>
              }
            >
              <Suspense fallback={<LibraryRecommendationsSkeleton />}>
                <LibraryRecommendations />
              </Suspense>
            </ErrorBoundary>
          </Stack>

          <Suspense fallback={<LibraryRecentCollectionsSkeleton />}>
            <LibraryRecentCollections />
          </Suspense>

          <Suspense fallback={<LibraryRecentCardsSkeleton />}>
            <LibraryRecentCards />
          </Suspense>
        </Stack>
      </Stack>
    </Container>
  );
}
