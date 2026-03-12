import { useQueries } from '@tanstack/react-query';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { getCollectionsForUrl } from '@/features/collections/lib/dal';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';

interface Props {
  url: string | undefined;
  enabled?: boolean;
}

/**
 * Fetches URL metadata and collections containing this URL for graph node popups
 * Uses parallel queries for optimal performance
 */
export default function useGraphNodeUrl({ url, enabled = true }: Props) {
  const results = useQueries({
    queries: [
      {
        queryKey: url ? [url] : ['graph', 'url', 'metadata', 'empty'],
        queryFn: () => {
          if (!url) throw new Error('URL is required');
          return getUrlMetadata({ url });
        },
        enabled: enabled && !!url,
        staleTime: 3 * 60 * 1000, // 3 minutes - URLs change more often
        retry: 1,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: url
          ? collectionKeys.bySembleUrl(url)
          : ['graph', 'url', 'collections', 'empty'],
        queryFn: () => {
          if (!url) throw new Error('URL is required');
          return getCollectionsForUrl(url, { limit: 5 }); // Get first 5 collections
        },
        enabled: enabled && !!url,
        staleTime: 3 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const [metadataQuery, collectionsQuery] = results;

  return {
    metadata: metadataQuery.data?.metadata,
    collections: collectionsQuery.data?.collections || [],
    isLoading: metadataQuery.isLoading || collectionsQuery.isLoading,
    error: metadataQuery.error || collectionsQuery.error,
    metadataError: metadataQuery.error,
    collectionsError: collectionsQuery.error,
  };
}
