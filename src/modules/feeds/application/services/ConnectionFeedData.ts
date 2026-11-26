import type { Connection } from '../../../cards/domain/Connection';
import type {
  ICardQueryRepository,
  AnnotationCardView,
} from '../../../cards/domain/ICardQueryRepository';
import type { ProfileEnricher } from '../../../cards/application/services/ProfileEnricher';
import type { UrlOrCardId } from '../../../cards/domain/value-objects/UrlOrCardId';
import { toUrlMetadataDTO } from '../../../cards/domain/value-objects/urlMetadataMapping';
import { toAnnotationCardDTO } from './AnnotationCardDto';

/**
 * A hydrated connection endpoint — mirrors the contract's
 * ConnectionEndpointViewSchema discriminated union. URL endpoints carry
 * link metadata and entity counts; CARD endpoints carry the annotation
 * card in full, the same shape card-list endpoints return.
 */
export type ConnectionEndpointDTO =
  | {
      type: 'URL';
      url: string;
      metadata: ReturnType<typeof toUrlMetadataDTO>;
      urlLibraryCount: number;
      urlInLibrary?: boolean;
      urlConnectionCount?: number;
      urlIsConnected?: boolean;
    }
  | {
      type: 'CARD';
      card: ReturnType<typeof toAnnotationCardDTO>;
    };

export interface ConnectionFeedData {
  id: string;
  type?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  curatorId: string;
  source: ConnectionEndpointDTO;
  target: ConnectionEndpointDTO;
}

/**
 * Hydrate connections for CONNECTION_CREATED feed items. URL endpoints get
 * the metadata stored on the connection plus URL library stats; CARD
 * endpoints resolve to their annotation card. Connections with an
 * unresolvable endpoint (a CARD endpoint whose card or author can't be
 * hydrated) are omitted.
 *
 * annotationViewMap / cardAuthorProfiles are shared with the rest of the
 * feed hydration and extended in place with connection-only cards, so
 * callers must pass Maps they own for the lifetime of the request.
 */
export async function hydrateConnectionFeedData(
  connections: Connection[],
  cardQueryRepository: ICardQueryRepository,
  profileEnricher: ProfileEnricher,
  annotationViewMap: Map<string, AnnotationCardView>,
  cardAuthorProfiles: Map<string, any>,
  callingUserId?: string,
): Promise<Map<string, ConnectionFeedData>> {
  // Split endpoints by type — URL endpoints need library info, CARD
  // endpoints resolve to their annotation card
  const endpointUrls = new Set<string>();
  const endpointCardIds = new Set<string>();
  for (const connection of connections) {
    for (const endpoint of [connection.source, connection.target]) {
      if (endpoint.url) {
        endpointUrls.add(endpoint.url.value);
      } else if (endpoint.cardId) {
        endpointCardIds.add(endpoint.cardId.getStringValue());
      }
    }
  }

  // Annotation views for CARD endpoints — ids already batched for other
  // activity types are reused via the shared map
  const missingAnnotationIds = [...endpointCardIds].filter(
    (id) => !annotationViewMap.has(id),
  );
  if (missingAnnotationIds.length > 0) {
    const views =
      await cardQueryRepository.getBatchAnnotationCardViews(
        missingAnnotationIds,
      );
    for (const [id, view] of views) {
      annotationViewMap.set(id, view);
    }
  }

  // Card author profiles for annotation views not yet covered
  const missingAuthorIds = [
    ...new Set(
      [...endpointCardIds].flatMap((id) => {
        const authorId = annotationViewMap.get(id)?.authorId;
        return authorId && !cardAuthorProfiles.has(authorId) ? [authorId] : [];
      }),
    ),
  ];
  if (missingAuthorIds.length > 0) {
    const profilesResult = await profileEnricher.buildProfileMap(
      missingAuthorIds,
      callingUserId,
      {
        skipFailures: true, // Skip cards with failed author profiles
        mapToUser: false,
      },
    );
    if (profilesResult.isOk()) {
      for (const [id, profile] of profilesResult.value) {
        cardAuthorProfiles.set(id, profile);
      }
    }
  }

  // Library stats for URL endpoints
  const urlStatsMap = new Map<
    string,
    {
      urlLibraryCount: number;
      urlInLibrary?: boolean;
      urlConnectionCount?: number;
      urlIsConnected?: boolean;
    }
  >();
  if (endpointUrls.size > 0) {
    const libraryInfoMap = await cardQueryRepository.getBatchUrlLibraryInfo(
      [...endpointUrls],
      callingUserId,
    );
    endpointUrls.forEach((url) => {
      const urlInfo = libraryInfoMap.get(url);
      if (urlInfo) {
        urlStatsMap.set(url, {
          urlLibraryCount: urlInfo.urlLibraryCount,
          urlInLibrary: urlInfo.urlInLibrary,
          urlConnectionCount: urlInfo.urlConnectionCount,
          urlIsConnected: urlInfo.urlIsConnected,
        });
      }
    });
  }

  // Resolve an endpoint to its view; null when a CARD endpoint's card or
  // author can't be resolved (the connection is then skipped)
  const resolveEndpoint = (
    endpoint: UrlOrCardId,
    metadata: any,
  ): ConnectionEndpointDTO | null => {
    if (endpoint.cardId) {
      const view = annotationViewMap.get(endpoint.cardId.getStringValue());
      const author = view && cardAuthorProfiles.get(view.authorId);
      if (!view || !author) {
        return null;
      }
      return { type: 'CARD', card: toAnnotationCardDTO(view, author) };
    }

    const url = endpoint.url?.value;
    if (!url) {
      return null;
    }

    const stats = urlStatsMap.get(url);
    return {
      type: 'URL',
      url,
      // Stored connection metadata first, then just the URL itself
      metadata: toUrlMetadataDTO({
        ...(metadata?.props || metadata),
        url: metadata?.props?.url || metadata?.url || url,
      }),
      urlLibraryCount: stats?.urlLibraryCount ?? 0,
      urlInLibrary: stats?.urlInLibrary,
      urlConnectionCount: stats?.urlConnectionCount,
      urlIsConnected: stats?.urlIsConnected,
    };
  };

  const connectionDataMap = new Map<string, ConnectionFeedData>();
  for (const connection of connections) {
    const source = resolveEndpoint(
      connection.source,
      connection.sourceUrlMetadata,
    );
    const target = resolveEndpoint(
      connection.target,
      connection.targetUrlMetadata,
    );
    if (!source || !target) {
      continue;
    }

    connectionDataMap.set(connection.connectionId.getStringValue(), {
      id: connection.connectionId.getStringValue(),
      type: connection.type?.value,
      note: connection.note?.value,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      curatorId: connection.curatorId.value,
      source,
      target,
    });
  }

  return connectionDataMap;
}
