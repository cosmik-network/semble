'use client';

import CollectionContainerError from '@/features/collections/containers/collectionContainer/Error.CollectionContainer';
import { isNotFoundApiError } from '@/api-client/errors';
import CollectionNotFound from './not-found';

interface Props {
  error: Error & { digest?: string };
}

export default function Error({ error }: Props) {
  // Client-side fetches (React Query soft-nav / refetch) bypass the server's
  // notFound() guards, so a missing collection lands here instead. Render the
  // same not-found page rather than a generic "could not load" error.
  //
  // Note: in production Next.js redacts server-thrown errors before they reach
  // a client boundary, so this only matches client-thrown ApiErrors. Errors
  // thrown during SSR are handled by the notFound() guards in the layouts.
  if (isNotFoundApiError(error, 'COLLECTION_NOT_FOUND')) {
    return <CollectionNotFound />;
  }

  return <CollectionContainerError />;
}
