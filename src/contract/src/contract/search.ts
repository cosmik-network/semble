import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  UrlTypeSchema,
  ActivitySourceSchema,
  GetSimilarUrlsForUrlResponseSchema,
  SemanticSearchUrlsResponseSchema,
  SearchBskyPostsForUrlResponseSchema,
  SearchAtProtoAccountsResponseSchema,
  SearchLeafletDocsForUrlResponseSchema,
  RecommendedUrlsResponseSchema,
  RecommendedUsersResponseSchema,
  RecommendedCollectionsResponseSchema,
} from '@semble/types';
import { CoercedPaginatedSortedQuery } from './shared';

const c = initContract();

export const searchContract = c.router(
  {
    similarUrls: {
      method: 'GET',
      path: paths.similarUrls,
      query: CoercedPaginatedSortedQuery.extend({
        url: z.string(),
        threshold: z.coerce.number().optional(),
        urlType: UrlTypeSchema.optional(),
      }),
      responses: { 200: GetSimilarUrlsForUrlResponseSchema },
      summary: 'Find similar URLs',
      description:
        'Returns URLs semantically similar to a given URL using vector similarity search.',
    },
    semantic: {
      method: 'GET',
      path: paths.semantic,
      query: CoercedPaginatedSortedQuery.extend({
        query: z.string(),
        threshold: z.coerce.number().optional(),
        urlType: UrlTypeSchema.optional(),
        identifier: z.string().optional(),
      }),
      responses: { 200: SemanticSearchUrlsResponseSchema },
      summary: 'Semantic search',
      description:
        'Returns URLs matching a natural-language query using vector search, optionally scoped to a user and filtered by type.',
    },
    bskyPosts: {
      method: 'GET',
      path: paths.bskyPosts,
      query: z.object({
        q: z.string(),
        sort: z.string().optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        mentions: z.string().optional(),
        author: z.string().optional(),
        lang: z.string().optional(),
        domain: z.string().optional(),
        url: z.string().optional(),
        tag: z.array(z.string()).optional(),
        limit: z.coerce.number().optional(),
        cursor: z.string().optional(),
      }),
      responses: { 200: SearchBskyPostsForUrlResponseSchema },
      summary: 'Search Bluesky posts',
      description:
        'Searches Bluesky posts via the AT Protocol, proxied through the Semble API.',
      metadata: { internal: true } as const,
    },
    atProtoAccounts: {
      method: 'GET',
      path: paths.atProtoAccounts,
      query: z.object({
        term: z.string().optional(),
        q: z.string().optional(),
        limit: z.coerce.number().optional(),
        cursor: z.string().optional(),
      }),
      responses: { 200: SearchAtProtoAccountsResponseSchema },
      summary: 'Search AT Protocol accounts',
      description:
        'Searches for AT Protocol user accounts by handle or display name.',
    },
    leafletDocs: {
      method: 'GET',
      path: paths.leafletDocs,
      query: z.object({
        url: z.string(),
        limit: z.coerce.number().optional(),
        cursor: z.string().optional(),
      }),
      responses: { 200: SearchLeafletDocsForUrlResponseSchema },
      summary: 'Search Leaflet documents for a URL',
      description:
        'Returns Leaflet documents that reference or annotate a given URL.',
      metadata: { internal: true } as const,
    },
    recommended: {
      method: 'GET',
      path: paths.recommended,
      query: z.object({
        // A single ?queries=x arrives as a string; repeated params arrive as an array
        queries: z.union([z.string(), z.array(z.string())]),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: RecommendedUrlsResponseSchema },
      summary: 'Recommended URLs',
      description:
        'Returns URLs recommended for a set of query strings, ranked by network activity (saves, notes, collections, connections) with randomized ordering, excluding URLs the calling user already saved. Paginated over a cached ranked set.',
      metadata: { internal: true } as const,
    },
    recommendedUsers: {
      method: 'GET',
      path: paths.recommendedUsers,
      query: z.object({
        // A single ?urls=x arrives as a string; repeated params arrive as an array
        urls: z.union([z.string(), z.array(z.string())]),
      }),
      responses: { 200: RecommendedUsersResponseSchema },
      summary: 'Recommended users',
      description:
        'Returns users recommended for a set of URLs — users who saved or connected those URLs, plus Semble users the caller follows on Bluesky — ranked by activity, followers, recency, and Bluesky follow status, excluding users the caller already follows.',
      metadata: { internal: true } as const,
    },
    recommendedCollections: {
      method: 'GET',
      path: paths.recommendedCollections,
      query: z.object({
        // A single ?urls=x arrives as a string; repeated params arrive as an array
        urls: z.union([z.string(), z.array(z.string())]),
      }),
      responses: { 200: RecommendedCollectionsResponseSchema },
      summary: 'Recommended collections',
      description:
        'Returns collections containing any of the given URLs, ranked by card count, follower count, update recency, and whether the caller follows the collection author on Bluesky.',
      metadata: { internal: true } as const,
    },
  },
  { strictStatusCodes: true },
);
