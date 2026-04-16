import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { ConnectionType } from '@semble/types';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';

export default function useCreateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: {
      sourceUrl: string;
      targetUrl: string;
      connectionType?: ConnectionType;
      note?: string;
    }) => {
      return createConnection(params);
    },

    onSuccess: (_data, variables) => {
      // Invalidate all connection queries
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
      // Invalidate all feed queries so the new connection appears in feeds
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      // Invalidate all card queries so connection count updates everywhere
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      // Invalidate all collection queries so connection count updates in collection views
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });

      // Invalidate forward connections for source URL
      queryClient.invalidateQueries({
        queryKey: connectionKeys.forwardForUrl(variables.sourceUrl),
      });

      // Invalidate backward connections for target URL
      queryClient.invalidateQueries({
        queryKey: connectionKeys.backwardForUrl(variables.targetUrl),
      });

      // Invalidate all profile queries with stats to update connectionCount in ProfileTabs
      queryClient.invalidateQueries({
        queryKey: profileKeys.all(),
      });

      // Invalidate URL metadata with stats for both source and target URLs to update tab counts
      queryClient.invalidateQueries({
        queryKey: cardKeys.urlMetadata(variables.sourceUrl, {
          includeStats: true,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: cardKeys.urlMetadata(variables.targetUrl, {
          includeStats: true,
        }),
      });
    },
  });

  return mutation;
}
