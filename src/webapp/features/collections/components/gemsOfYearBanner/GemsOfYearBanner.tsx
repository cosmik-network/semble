'use client';

import { Button, Group, Stack, Title, Text } from '@mantine/core';
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
      <Group justify="space-between" align="center">
        <Stack gap={0}>
          <Title order={1} size="h1">
            Gems of 2025
          </Title>
          <Text fw={500} fz={'lg'}>
            Collections from our community
          </Text>
        </Stack>

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

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName="💎 Picks of 2025"
      />
    </>
  );
}
