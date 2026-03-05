'use client';

import { Container, Stack, Alert, Button, Title, Text } from '@mantine/core';
import { IoAlertCircleOutline, IoRefreshOutline } from 'react-icons/io5';
import { useEffect } from 'react';

export default function GraphError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or error reporting service
    console.error('Graph view error:', error);
  }, [error]);

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg">
        <IoAlertCircleOutline size={64} color="var(--mantine-color-red-6)" />
        <Stack align="center" gap="xs">
          <Title order={2}>Failed to load graph</Title>
          <Text c="dimmed" ta="center">
            {error.message ||
              'An unexpected error occurred while loading the graph visualization.'}
          </Text>
        </Stack>

        <Alert
          variant="light"
          color="red"
          icon={<IoAlertCircleOutline size={16} />}
          title="Error Details"
        >
          {error.digest && (
            <Text size="xs" c="dimmed">
              Error ID: {error.digest}
            </Text>
          )}
          <Text size="sm" mt="xs">
            Try refreshing the page or contact support if the problem persists.
          </Text>
        </Alert>

        <Button
          onClick={reset}
          leftSection={<IoRefreshOutline size={16} />}
          variant="light"
          size="lg"
        >
          Try Again
        </Button>
      </Stack>
    </Container>
  );
}
