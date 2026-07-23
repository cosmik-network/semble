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
    searchResults.pages.some((page) => (page.collections ?? []).length > 0);

  return (
    <>
      <Group justify="space-between" align="center">
        <Stack gap={0}>
          <Text fw={700} c="grape">
            Gem Collections
          </Text>
          <Title order={2}>From our community</Title>
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
