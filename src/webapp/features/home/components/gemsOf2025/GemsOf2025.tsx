'use client';

import { Group, Stack, Text, Button, Card } from '@mantine/core';
import Link from 'next/link';
import Banner from '@/assets/gems-of-2025-banner.webp';
import useCollectionSearch from '@/features/collections/lib/queries/useCollectionSearch';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import { useState } from 'react';

export default function GemsOf2025() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data: searchResults, isLoading: isLoadingSearchResults } =
    useCollectionSearch({ query: '💎' });

  const hasGemsCollection =
    !isLoadingSearchResults &&
    searchResults &&
    searchResults.collections.length > 0;

  return (
    <>
      <Card
        p="xl"
        radius="lg"
        withBorder
        style={{
          backgroundImage: `url(${Banner.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Group gap="md" justify="center" style={{ position: 'relative' }}>
          <Stack align="center">
            <Stack gap={0} align="center">
              <Text fw={700} ta={'center'} fz={'h2'} c={'white'}>
                💎 Gems of 2025 💎
              </Text>
              <Text fw={700} ta={'center'} fz={'lg'} c={'blue.1'}>
                Top picks from our community
              </Text>
            </Stack>
            <Group gap={'xs'} justify="center">
              <Button
                component={Link}
                href="/explore/gems-of-2025"
                size="md"
                variant="white"
                color={'blue.8'}
              >
                Explore
              </Button>
              {!isLoadingSearchResults && (
                <>
                  {hasGemsCollection ? (
                    <Button
                      component={Link}
                      href="/explore/gems-of-2025/collections"
                      size="md"
                      variant="white"
                      color={'grape'}
                    >
                      View collections
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      variant="white"
                      color="grape"
                      onClick={() => setIsDrawerOpen(true)}
                    >
                      Create your collection
                    </Button>
                  )}
                </>
              )}
            </Group>
          </Stack>
        </Group>
      </Card>

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName="💎 Picks of 2025"
      />
    </>
  );
}
