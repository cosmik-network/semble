'use client';

import { Alert, Container } from '@mantine/core';
import { isNotFoundApiError } from '@/api-client/errors';

interface Props {
  error: Error & { digest?: string };
}

export default function Error({ error }: Props) {
  const notFound = isNotFoundApiError(error, 'COLLECTION_NOT_FOUND');

  return (
    <Container p="xs" fluid>
      <Alert
        color={notFound ? 'gray' : 'red'}
        title={notFound ? 'Collection not found' : 'Could not load collection'}
      >
        {notFound
          ? 'This collection does not exist. The handle may have changed or the collection was removed.'
          : 'Something went wrong while loading this collection.'}
      </Alert>
    </Container>
  );
}
