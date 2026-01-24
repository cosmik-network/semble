'use client';

import { useEffect, useState } from 'react';
import { ApiClient, CollectionAccessType } from '@/api-client/ApiClient';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Alert,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { FiLock, FiUnlock } from 'react-icons/fi';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (collectionId: string, collectionName: string) => void;
  apiClient: ApiClient;
  initialName?: string;
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  onSuccess,
  apiClient,
  initialName = '',
}: CreateCollectionModalProps) {
  const { data: featureFlags } = useFeatureFlags();
  const form = useForm({
    initialValues: {
      name: initialName,
      description: '',
      accessType: CollectionAccessType.CLOSED,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!form.getValues().name.trim()) {
      setError('Collection name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.createCollection({
        name: form.getValues().name.trim(),
        description: form.getValues().description.trim() || undefined,
        accessType: featureFlags?.openCollections
          ? form.getValues().accessType
          : undefined,
      });

      // Success
      onSuccess?.(response.collectionId, form.getValues().name.trim());
      handleClose();
    } catch (error: any) {
      console.error('Error creating collection:', error);
      setError(
        error.message || 'Failed to create collection. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      form.reset();
      setError('');
    }
  };

  // Update form when initialName changes
  useEffect(() => {
    if (isOpen && initialName !== form.getValues().name) {
      form.setFieldValue('name', initialName);
    }
  }, [isOpen, initialName, form]);

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="Create Collection"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Enter collection name"
            disabled={loading}
            required
            maxLength={100}
            key={form.key('name')}
            {...form.getInputProps('name')}
          />

          <Textarea
            label="Description"
            placeholder="Describe what this collection is about..."
            disabled={loading}
            rows={3}
            maxLength={500}
            key={form.key('description')}
            {...form.getInputProps('description')}
          />

          {featureFlags?.openCollections && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Access Type
              </Text>
              <SegmentedControl
                data={[
                  {
                    label: (
                      <Group gap="xs">
                        <FiUnlock size={14} />
                        <Text size="sm">Open</Text>
                      </Group>
                    ),
                    value: CollectionAccessType.OPEN,
                  },
                  {
                    label: (
                      <Group gap="xs">
                        <FiLock size={14} />
                        <Text size="sm">Closed</Text>
                      </Group>
                    ),
                    value: CollectionAccessType.CLOSED,
                  },
                ]}
                disabled={loading}
                key={form.key('accessType')}
                {...form.getInputProps('accessType')}
              />
              <Text size="xs" c="dimmed">
                {form.getValues().accessType === CollectionAccessType.OPEN
                  ? 'Anyone can add cards to this collection'
                  : 'Only you can add cards to this collection'}
              </Text>
            </Stack>
          )}

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'Creating...' : 'Create Collection'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
