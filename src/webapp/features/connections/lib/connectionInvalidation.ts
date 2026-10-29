import type { QueryClient } from '@tanstack/react-query';
import type {
  DeleteConnectionRequest,
  UpdateConnectionRequest,
} from '@semble/types';
import { canvasKeys } from '@/features/canvas/lib/canvasKeys';
import { announceLinkChange } from '@/features/canvas/lib/linkChanges';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { tagKeys } from '@/features/tags/lib/tagKeys';
import { connectionKeys } from './connectionKeys';

function invalidateUrlMetadataWithStats(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query): boolean => {
      const key = query.queryKey as unknown[];
      return !!(
        key[0] === 'cards' &&
        key[1] === 'metadata' &&
        key[3] &&
        typeof key[3] === 'object' &&
        'includeStats' in key[3] &&
        key[3].includeStats === true
      );
    },
  });
}

// Canvas boards draw connections as arrows, here and in other tabs
function invalidateCanvasConnection(
  queryClient: QueryClient,
  connectionId: string,
) {
  queryClient.invalidateQueries({ queryKey: canvasKeys.links() });
  announceLinkChange({ connectionIds: [connectionId] });
}

// Shared by the webapp's mutations and the canvas, which calls the server
// itself
export function invalidateAfterConnectionCreated(
  queryClient: QueryClient,
  variables: { sourceUrl: string; targetUrl: string },
) {
  // Invalidate all connection queries
  queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
  // Invalidate all feed queries so the new connection appears in feeds
  queryClient.invalidateQueries({ queryKey: feedKeys.all() });
  // Invalidate all card queries so connection count updates everywhere
  queryClient.invalidateQueries({ queryKey: cardKeys.all() });
  // Canvas boards in other tabs draw it as an arrow
  announceLinkChange({ urls: [variables.sourceUrl, variables.targetUrl] });
  // Invalidate all collection queries so connection count updates in collection views
  queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
  // Invalidate tag queries so tags typed in the connection note appear in autocomplete
  queryClient.invalidateQueries({ queryKey: tagKeys.all() });

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
}

export function invalidateAfterConnectionDeleted(
  queryClient: QueryClient,
  request: DeleteConnectionRequest,
) {
  // Invalidate all connection queries to ensure deletions are reflected everywhere
  queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
  // Invalidate all feed queries to remove deleted connection items from feeds
  queryClient.invalidateQueries({ queryKey: feedKeys.all() });
  // Invalidate all profile queries with stats to update connectionCount in ProfileTabs
  queryClient.invalidateQueries({ queryKey: profileKeys.all() });
  queryClient.invalidateQueries({ queryKey: tagKeys.all() });
  // Every card in a list holds its own connection count; this is the one
  // mutation here that doesn't invalidate cardKeys.all(), so clear them
  // explicitly.
  queryClient.invalidateQueries({ queryKey: cardKeys.urlStatuses() });
  invalidateCanvasConnection(queryClient, request.connectionId);
  // Invalidate all URL metadata queries with stats to update tab counts
  invalidateUrlMetadataWithStats(queryClient);
}

export function invalidateAfterConnectionUpdated(
  queryClient: QueryClient,
  request: UpdateConnectionRequest,
) {
  // Invalidate all connection queries to ensure updates appear everywhere
  queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
  // Invalidate all feed queries to update connection items in feeds
  queryClient.invalidateQueries({ queryKey: feedKeys.all() });
  // Invalidate tag queries so tags typed in the connection note appear in autocomplete
  queryClient.invalidateQueries({ queryKey: tagKeys.all() });
  invalidateCanvasConnection(queryClient, request.connectionId);
  // Invalidate all URL metadata queries with stats to update tab counts
  invalidateUrlMetadataWithStats(queryClient);
}
