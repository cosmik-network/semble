'use client';

import { Button, Container, Group, Title } from '@mantine/core';
import { useState } from 'react';
import useCollectionSearch from '../../lib/queries/useCollectionSearch';
import CreateCollectionDrawer from '../createCollectionDrawer/CreateCollectionDrawer';
import { FiPlus } from 'react-icons/fi';

export default function GemsOfYearBanner() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data: searchResults, isLoading: isLoadingSearchResults } =
    useCollectionSearch({ query: '💎' });

  const hasGemsCollection =
    !isLoadingSearchResults &&
    searchResults &&
    searchResults.collections.length > 0;

  return (
    <>
      <Container p="xs" size="xl">
        <Group justify="space-between" align="center" py="md">
          <Title order={1} size="h2">
            Gems of 2025
          </Title>

          {!hasGemsCollection && (
            <Button
              variant="light"
              color="grape"
              leftSection={<FiPlus size={18} />}
              onClick={() => setIsDrawerOpen(true)}
            >
              Create your own
            </Button>
          )}
        </Group>
      </Container>

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName="💎 Picks of 2025"
      />
    </>
  );
}
