'use client';

import { useState, useMemo } from 'react';
import {
  Stack,
  TextInput,
  Text,
  Box,
  Checkbox,
  Badge,
  Group,
} from '@mantine/core';
import { ApiClient, Collection } from '@/api-client';
import { useCollectionSearch } from '@/hooks/useCollectionSearch';
import { CreateCollectionModal } from './CreateCollectionModal';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface LocalCollection extends Collection {
  authorId: string; // Extended for local component use
}

interface CollectionSelectorProps {
  apiClient: ApiClient;
  userId?: string;
  selectedCollectionIds: string[];
  onSelectionChange: (collectionIds: string[]) => void;
  existingCollections?: LocalCollection[];
  disabled?: boolean;
  showCreateOption?: boolean;
  placeholder?: string;
  preSelectedCollectionId?: string | null;
}

export function CollectionSelector({
  apiClient,
  userId,
  selectedCollectionIds,
  onSelectionChange,
  existingCollections = [],
  disabled = false,
  showCreateOption = true,
  placeholder = 'Search collections...',
  preSelectedCollectionId,
}: CollectionSelectorProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Get existing collection IDs for filtering
  const existingCollectionIds = useMemo(() => {
    return existingCollections.map((collection) => collection.id);
  }, [existingCollections]);

  // Collection search hook
  const {
    collections: allCollections,
    loading: collectionsLoading,
    searchText,
    setSearchText,
    handleSearchKeyPress,
    loadCollections,
  } = useCollectionSearch({
    apiClient,
    initialLoad: true,
  });

  // Filter out existing collections from search results
  const availableCollections = useMemo(() => {
    return allCollections.filter(
      (collection) => !existingCollectionIds.includes(collection.id),
    );
  }, [allCollections, existingCollectionIds]);

  const handleCollectionToggle = (collectionId: string) => {
    const newSelection = selectedCollectionIds.includes(collectionId)
      ? selectedCollectionIds.filter((id) => id !== collectionId)
      : [...selectedCollectionIds, collectionId];
    onSelectionChange(newSelection);
  };

  const handleCreateCollection = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCreateModalOpen(true);
  };

  const handleCreateCollectionSuccess = (
    collectionId: string,
    collectionName: string,
  ) => {
    onSelectionChange([...selectedCollectionIds, collectionId]);
    loadCollections(searchText.trim() || undefined);
    setCreateModalOpen(false);
  };

  return (
    <>
      <Stack gap="sm">
        <Text fw={500} size="sm">
          Collections
        </Text>

        {/* Show existing collections */}
        {existingCollections.length > 0 && (
          <Box>
            <Text size="xs" c="dimmed" mb="xs">
              Already in {existingCollections.length} collection
              {existingCollections.length !== 1 && 's'}:
            </Text>
            <Group gap="xs">
              {existingCollections.map((collection) => {
                const marginUrl = getMarginUrl(
                  collection.uri,
                  collection.author?.handle,
                );
                return (
                  <Badge key={collection.id} variant="light" color="blue">
                    <Group gap={4}>
                      {collection.name}
                      {isMarginUri(collection.uri) && (
                        <MarginLogo size={10} marginUrl={marginUrl} />
                      )}
                    </Group>
                  </Badge>
                );
              })}
            </Group>
          </Box>
        )}

        <Text size="sm" c="dimmed">
          {existingCollections.length > 0
            ? 'Add to additional collections (optional)'
            : 'Select collections (optional)'}
        </Text>

        <TextInput
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
          onKeyPress={handleSearchKeyPress}
          disabled={disabled}
          size="sm"
        />

        <Box>
          {availableCollections.length > 0 ? (
            <Stack gap={0}>
              <Text size="xs" c="dimmed" mb="xs">
                {availableCollections.length} collection
                {availableCollections.length !== 1 && 's'} found
              </Text>
              {searchText.trim() && showCreateOption && (
                <Box
                  p="sm"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'var(--mantine-color-green-0)',
                    borderRadius: '4px',
                    border: '1px solid var(--mantine-color-green-4)',
                    marginBottom: '4px',
                  }}
                  onClick={(e) => handleCreateCollection(e)}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={500} size="sm" c="green.7">
                        {`Create new collection "${searchText.trim()}"`}
                      </Text>
                      <Text size="xs" c="green.6">
                        Click to create a new collection with this name
                      </Text>
                    </Stack>
                    <Text size="xs" c="green.6" fw={500}>
                      + New
                    </Text>
                  </Group>
                </Box>
              )}
              {availableCollections.map((collection, index) => {
                const marginUrl = getMarginUrl(
                  collection.uri,
                  collection.author?.handle,
                );
                return (
                  <Box
                    key={collection.id}
                    p="sm"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedCollectionIds.includes(
                        collection.id,
                      )
                        ? 'var(--mantine-color-blue-0)'
                        : index % 2 === 0
                          ? 'var(--mantine-color-gray-0)'
                          : 'transparent',
                      borderRadius: '4px',
                      border: selectedCollectionIds.includes(collection.id)
                        ? '1px solid var(--mantine-color-blue-4)'
                        : '1px solid transparent',
                    }}
                    onClick={() => handleCollectionToggle(collection.id)}
                  >
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" align="center">
                          <Text fw={500} size="sm" truncate>
                            {collection.name}
                          </Text>
                          {isMarginUri(collection.uri) && (
                            <MarginLogo size={12} marginUrl={marginUrl} />
                          )}
                          <Text size="xs" c="dimmed">
                            {collection.cardCount} cards
                          </Text>
                        </Group>
                        {collection.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {collection.description}
                          </Text>
                        )}
                      </Stack>
                      <Checkbox
                        checked={selectedCollectionIds.includes(collection.id)}
                        onChange={() => handleCollectionToggle(collection.id)}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          ) : searchText.trim() ? (
            <Stack gap="sm" py="md">
              {!collectionsLoading && (
                <Text size="sm" c="dimmed" ta="center">
                  {`No collections found for "${searchText.trim()}"`}
                </Text>
              )}
              {showCreateOption && (
                <Box
                  p="sm"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'var(--mantine-color-green-0)',
                    borderRadius: '4px',
                    border: '1px solid var(--mantine-color-green-4)',
                  }}
                  onClick={(e) => handleCreateCollection(e)}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={500} size="sm" c="green.7">
                        {`Create new collection "${searchText.trim()}"`}
                      </Text>
                      <Text size="xs" c="green.6">
                        Click to create a new collection with this name
                      </Text>
                    </Stack>
                    <Text size="xs" c="green.6" fw={500}>
                      + New
                    </Text>
                  </Group>
                </Box>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" py="md" ta="center">
              No collections found. You can create collections from your
              library.
            </Text>
          )}
        </Box>
      </Stack>

      {showCreateOption && (
        <CreateCollectionModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateCollectionSuccess}
          apiClient={apiClient}
          initialName={searchText.trim()}
        />
      )}
    </>
  );
}
