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

export const searchContract = c.router({
  similarUrls: {
    method: 'GET',
    path: paths.similarUrls,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
      threshold: z.coerce.number().optional(),
      urlType: UrlTypeSchema.optional(),
    }),
    responses: { 200: GetSimilarUrlsForUrlResponseSchema },
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
  },
});
