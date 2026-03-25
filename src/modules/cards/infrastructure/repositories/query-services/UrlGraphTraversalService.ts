import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  GraphNodeDTO,
  GraphEdgeDTO,
  GraphDataDTO,
} from '../../../domain/IGraphQueryRepository';

export class UrlGraphTraversalService {
  constructor(private db: PostgresJsDatabase) {}

  async getUrlSubGraph(
    targetUrl: string,
    depth: number = 1,
  ): Promise<GraphDataDTO> {
    // Validate depth
    const validDepth = Math.max(1, Math.min(5, depth));

    // Step 1: Find all nodes within N hops using recursive traversal
    const visitedNodeIds = new Set<string>();
    const edges: GraphEdgeDTO[] = [];
    const urlsToFetch = new Set<string>([targetUrl]);
    const collectionsToFetch = new Set<string>();

    // Traverse graph level by level (BFS approach)
    for (let currentDepth = 0; currentDepth < validDepth; currentDepth++) {
      const newUrlsToFetch = new Set<string>();
      const newCollectionsToFetch = new Set<string>();

      // Fetch edges for current level
      const currentLevelEdges = await this.getEdgesForUrls(
        Array.from(urlsToFetch),
      );

      // Process edges and collect new nodes to fetch
      for (const edge of currentLevelEdges) {
        // Skip if we've already seen this edge
        if (edges.some((e) => e.id === edge.id)) continue;

        edges.push(edge);

        // Extract node IDs from edge source/target
        const [sourceType, sourceId] = this.parseNodeId(edge.source);
        const [targetType, targetId] = this.parseNodeId(edge.target);

        // Mark nodes as visited and queue for next level if needed
        if (!visitedNodeIds.has(edge.source)) {
          visitedNodeIds.add(edge.source);
          if (currentDepth < validDepth - 1) {
            this.queueNodeForFetch(
              sourceType,
              sourceId,
              newUrlsToFetch,
              newCollectionsToFetch,
            );
          }
        }

        if (!visitedNodeIds.has(edge.target)) {
          visitedNodeIds.add(edge.target);
          if (currentDepth < validDepth - 1) {
            this.queueNodeForFetch(
              targetType,
              targetId,
              newUrlsToFetch,
              newCollectionsToFetch,
            );
          }
        }
      }

      // Get collections containing current URLs
      for (const url of urlsToFetch) {
        const relatedData = await this.getRelatedNodesForUrl(url);
        relatedData.collections.forEach((c) => {
          // Only add if not already discovered
          if (!collectionsToFetch.has(c) && !newCollectionsToFetch.has(c)) {
            newCollectionsToFetch.add(c);
          }
        });
      }

      // For each newly discovered collection, fetch all URLs it contains
      // and add them to the queue for the next depth level
      for (const collectionId of newCollectionsToFetch) {
        if (currentDepth < validDepth - 1) {
          const urlsInCollection = await this.getUrlsInCollection(collectionId);
          for (const url of urlsInCollection) {
            const urlNodeId = `url:${url}`;
            if (!visitedNodeIds.has(urlNodeId)) {
              visitedNodeIds.add(urlNodeId);
              newUrlsToFetch.add(url);
            }
          }
        }
      }

      // Update for next iteration
      urlsToFetch.clear();
      newUrlsToFetch.forEach((u) => urlsToFetch.add(u));
      newCollectionsToFetch.forEach((c) => collectionsToFetch.add(c));

      // If no new nodes to explore, break early
      if (urlsToFetch.size === 0 && collectionsToFetch.size === 0) {
        break;
      }
    }

    // Step 2: Fetch all visited nodes
    const nodes = await this.fetchNodes(
      targetUrl,
      Array.from(visitedNodeIds),
      Array.from(collectionsToFetch),
    );

    return {
      nodes,
      edges,
      totalNodeCount: nodes.length,
    };
  }

  private parseNodeId(nodeId: string): [string, string] {
    const [type, ...idParts] = nodeId.split(':');
    return [type || '', idParts.join(':')];
  }

  private queueNodeForFetch(
    nodeType: string,
    nodeId: string,
    urls: Set<string>,
    collections: Set<string>,
  ): void {
    switch (nodeType) {
      case 'url':
        urls.add(nodeId);
        break;
      case 'collection':
        collections.add(nodeId);
        break;
    }
  }

  private async getEdgesForUrls(urls: string[]): Promise<GraphEdgeDTO[]> {
    if (urls.length === 0) return [];

    const edges: GraphEdgeDTO[] = [];

    // Build a PostgreSQL array literal
    const urlArrayLiteral = sql.raw(
      `ARRAY[${urls.map((url) => `'${url.replace(/'/g, "''")}'`).join(',')}]::text[]`,
    );

    // Fetch URL connection edges
    const connectionEdges = await this.db.execute<{
      id: string;
      source_value: string;
      target_value: string;
      connection_type: string | null;
      note: string | null;
      curator_id: string;
    }>(sql`
      SELECT
        id,
        source_value,
        target_value,
        connection_type,
        note,
        curator_id
      FROM connections
      WHERE source_type = 'URL' AND target_type = 'URL'
        AND (source_value = ANY(${urlArrayLiteral}) OR target_value = ANY(${urlArrayLiteral}))
    `);

    edges.push(
      ...connectionEdges.map((row) => ({
        id: `connection:${row.id}`,
        source: `url:${row.source_value}`,
        target: `url:${row.target_value}`,
        type: 'URL_CONNECTS_URL' as const,
        metadata: {
          connectionType: row.connection_type,
          note: row.note,
          curatorId: row.curator_id,
        },
      })),
    );

    // Fetch collection contains URL edges
    const collectionUrlEdges = await this.db.execute<{
      collection_id: string;
      url: string;
      added_by: string;
    }>(sql`
      SELECT
        cc.collection_id,
        c.url,
        cc.added_by
      FROM collection_cards cc
      INNER JOIN cards c ON cc.card_id = c.id
      WHERE c.type = 'URL'
        AND c.url IS NOT NULL
        AND c.url = ANY(${urlArrayLiteral})
    `);

    edges.push(
      ...collectionUrlEdges.map((row) => ({
        id: `collection-url:${row.collection_id}:${row.url}`,
        source: `collection:${row.collection_id}`,
        target: `url:${row.url}`,
        type: 'COLLECTION_CONTAINS_URL' as const,
        metadata: {
          addedBy: row.added_by,
        },
      })),
    );

    return edges;
  }

  private async getRelatedNodesForUrl(url: string): Promise<{
    collections: string[];
  }> {
    // Get collections containing this URL
    const collections = await this.db.execute<{ collection_id: string }>(sql`
      SELECT DISTINCT cc.collection_id
      FROM collection_cards cc
      INNER JOIN cards c ON cc.card_id = c.id
      WHERE c.type = 'URL' AND c.url = ${url}
    `);

    return {
      collections: collections.map((r) => r.collection_id),
    };
  }

  private async getUrlsInCollection(collectionId: string): Promise<string[]> {
    // Get all URLs contained in this collection
    const results = await this.db.execute<{ url: string }>(sql`
      SELECT DISTINCT c.url
      FROM collection_cards cc
      INNER JOIN cards c ON cc.card_id = c.id
      WHERE cc.collection_id = ${collectionId}
        AND c.type = 'URL'
        AND c.url IS NOT NULL
    `);

    return results.map((r) => r.url);
  }

  private async fetchNodes(
    targetUrl: string,
    visitedNodeIds: string[],
    collectionIds: string[],
  ): Promise<GraphNodeDTO[]> {
    const nodes: GraphNodeDTO[] = [];

    // Extract URLs from visited node IDs
    const urlNodeIds = visitedNodeIds
      .filter((id) => id.startsWith('url:'))
      .map((id) => id.substring(4));

    // Always include the target URL, even if it's not in the database
    if (!urlNodeIds.includes(targetUrl)) {
      urlNodeIds.push(targetUrl);
    }

    // Fetch URL nodes
    if (urlNodeIds.length > 0) {
      const urlArrayLiteral = sql.raw(
        `ARRAY[${urlNodeIds.map((url) => `'${url.replace(/'/g, "''")}'`).join(',')}]::text[]`,
      );

      const urlResults = await this.db.execute<{
        id: string;
        url: string;
        content_data: any;
        url_type: string | null;
      }>(sql`
        SELECT DISTINCT
          id,
          url,
          content_data,
          url_type
        FROM cards
        WHERE type = 'URL'
          AND url IS NOT NULL
          AND url = ANY(${urlArrayLiteral})
      `);

      const fetchedUrls = new Set(urlResults.map((r) => r.url));

      // Add fetched URL nodes
      nodes.push(
        ...urlResults.map((row) => {
          const contentData = row.content_data as any;
          const title = contentData?.title || row.url || 'Untitled URL';

          return {
            id: `url:${row.url}`,
            type: 'URL' as const,
            label: title,
            metadata: {
              cardId: row.id,
              url: row.url,
              urlType: row.url_type,
              title,
              description: contentData?.description,
              imageUrl: contentData?.imageUrl,
            },
          };
        }),
      );

      // Add synthetic nodes for URLs not in database
      for (const url of urlNodeIds) {
        if (!fetchedUrls.has(url)) {
          nodes.push({
            id: `url:${url}`,
            type: 'URL' as const,
            label: url,
            metadata: {
              url,
              title: url,
              synthetic: true, // Mark as not in database
            },
          });
        }
      }
    }

    // Fetch collection nodes
    if (collectionIds.length > 0) {
      const collectionArrayLiteral = sql.raw(
        `ARRAY[${collectionIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}]::uuid[]`,
      );

      const collectionResults = await this.db.execute<{
        id: string;
        name: string;
        description: string | null;
        author_id: string;
        card_count: number;
      }>(sql`
        SELECT
          id,
          name,
          description,
          author_id,
          card_count
        FROM collections
        WHERE id = ANY(${collectionArrayLiteral})
      `);

      nodes.push(
        ...collectionResults.map((row) => ({
          id: `collection:${row.id}`,
          type: 'COLLECTION' as const,
          label: row.name,
          metadata: {
            collectionId: row.id,
            name: row.name,
            description: row.description,
            authorId: row.author_id,
            cardCount: row.card_count,
          },
        })),
      );
    }

    return nodes;
  }
}
