import { Container, Group, Stack, Title, Text } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import DiscoverOnSemble from '../../components/discoverOnSemble/DiscoverOnSemble';
import { ErrorBoundary } from 'react-error-boundary';
import RecentCollections from '../../components/recentCollections/RecentCollections';
import RecentCards from '../../components/recentCards/RecentCards';
import { Suspense } from 'react';
import DiscoverOnSembleSkeleton from '../../components/discoverOnSemble/Skeleton.DiscoverOnSemble';
import RecentCardsSkeleton from '../../components/recentCards/Skeleton.RecentCards';
import RecentCollectionsSkeleton from '../../components/recentCollections/Skeleton.RecentCollections';
import AtmosphereConfBanner from '../../components/atmosphereConfBanner/AtmosphereConfBanner';
import { LinkButton } from '@/components/link/MantineLink';

export default function HomeContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Stack gap={50}>
          <AtmosphereConfBanner />

          {/* Explore */}
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
                  <Stack align="center" gap="xs">
                    <Text fz="h3" fw={600} c="gray">
                      No recent activity to show yet
                    </Text>
                  </Stack>
                </Stack>
              }
            >
              <Suspense fallback={<DiscoverOnSembleSkeleton />}>
                <DiscoverOnSemble />
              </Suspense>
            </ErrorBoundary>
          </Stack>

          {/* Collections */}
          <Suspense fallback={<RecentCollectionsSkeleton />}>
            <RecentCollections />
          </Suspense>

          {/* Cards */}
          <Suspense fallback={<RecentCardsSkeleton />}>
            <RecentCards />
          </Suspense>
        </Stack>
      </Stack>
    </Container>
  );
}
