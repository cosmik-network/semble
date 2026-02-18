'use client';

import { useEffect, useState } from 'react';
import { ApiClient } from '@/api-client/ApiClient';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';

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
  const form = useForm({
    initialValues: {
      name: initialName,
      description: '',
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
      title="New Collection"
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
