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
  },
  { strictStatusCodes: true },
);
