import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  UrlTypeSchema,
  CollectionAccessTypeSchema,
  CreateCollectionRequestSchema,
  CreateCollectionResponseSchema,
  UpdateCollectionRequestSchema,
  UpdateCollectionResponseSchema,
  DeleteCollectionRequestSchema,
  DeleteCollectionResponseSchema,
  GetCollectionPageResponseSchema,
  GetCollectionsResponseSchema,
  SearchCollectionsParamsSchema,
  GetCollectionsForUrlParamsSchema,
  GetCollectionsForUrlResponseSchema,
  GetOpenCollectionsWithContributorParamsSchema,
  GetCollectionFollowersParamsSchema,
  GetCollectionFollowersResponseSchema,
  GetCollectionFollowersCountParamsSchema,
  GetFollowCountResponseSchema,
  GetCollectionContributorsParamsSchema,
  GetCollectionContributorsResponseSchema,
} from '@semble/types';
import { CoercedPaginatedSortedQuery } from './shared';

const c = initContract();

export const collectionsContract = c.router(
  {
    myCollections: {
      method: 'GET',
      path: paths.myCollections,
      query: CoercedPaginatedSortedQuery.extend({
        searchText: z.string().optional(),
      }),
      responses: { 200: GetCollectionsResponseSchema },
      summary: 'List my collections',
      description:
        "Returns a paginated list of the authenticated user's collections.",
    },
    createCollection: {
      method: 'POST',
      path: paths.createCollection,
      body: CreateCollectionRequestSchema,
      responses: { 200: CreateCollectionResponseSchema },
      summary: 'Create a collection',
      description: 'Creates a new collection for the authenticated user.',
    },
    collectionsForUrl: {
      method: 'GET',
      path: paths.collectionsForUrl,
      query: CoercedPaginatedSortedQuery.extend({
        url: z.string(),
      }),
      responses: { 200: GetCollectionsForUrlResponseSchema },
      summary: 'Get collections containing a URL',
      description: 'Returns collections that contain a specific URL.',
    },
    searchCollections: {
      method: 'GET',
      path: paths.searchCollections,
      query: CoercedPaginatedSortedQuery.extend({
        searchText: z.string().optional(),
        identifier: z.string().optional(),
        accessType: CollectionAccessTypeSchema.optional(),
      }),
      responses: { 200: GetCollectionsResponseSchema },
      summary: 'Search collections',
      description:
        'Full-text search across collection names and descriptions, optionally filtered by user or access type.',
    },
    collectionById: {
      method: 'GET',
      path: paths.collectionById,
      query: CoercedPaginatedSortedQuery.extend({
        collectionId: z.string(),
        urlType: UrlTypeSchema.optional(),
      }),
      responses: { 200: GetCollectionPageResponseSchema },
      summary: 'Get a collection by ID',
      description:
        'Returns a collection and its cards, paginated, by collection ID.',
    },
    updateCollection: {
      method: 'POST',
      path: paths.updateCollection,
      body: UpdateCollectionRequestSchema,
      responses: { 200: UpdateCollectionResponseSchema },
      summary: 'Update a collection',
      description:
        'Updates the name, description, or access type of a collection.',
    },
    deleteCollection: {
      method: 'POST',
      path: paths.deleteCollection,
      body: DeleteCollectionRequestSchema,
      responses: { 200: DeleteCollectionResponseSchema },
      summary: 'Delete a collection',
      description:
        'Permanently deletes a collection owned by the authenticated user.',
    },
    collectionsByUser: {
      method: 'GET',
      path: paths.collectionsByUser,
      query: CoercedPaginatedSortedQuery.extend({
        identifier: z.string(),
        searchText: z.string().optional(),
      }),
      responses: { 200: GetCollectionsResponseSchema },
      summary: "List a user's collections",
      description:
        'Returns a paginated list of collections owned by a user, identified by handle or DID.',
    },
    collectionByAtUri: {
      method: 'GET',
      path: paths.collectionByAtUri,
      query: CoercedPaginatedSortedQuery.extend({
        handle: z.string(),
        recordKey: z.string(),
        urlType: UrlTypeSchema.optional(),
      }),
      responses: { 200: GetCollectionPageResponseSchema },
      summary: 'Get a collection by AT URI',
      description:
        'Returns a collection and its cards, looked up by AT Protocol handle and record key.',
    },
    openWithContributor: {
      method: 'GET',
      path: paths.openWithContributor,
      query: CoercedPaginatedSortedQuery.extend({
        identifier: z.string(),
      }),
      responses: { 200: GetCollectionsResponseSchema },
      summary: 'List open collections with a contributor',
      description:
        'Returns open collections that a given user has contributed cards to.',
    },
    collectionFollowers: {
      method: 'GET',
      path: paths.collectionFollowers,
      query: z.object({
        collectionId: z.string(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetCollectionFollowersResponseSchema },
      summary: 'Get collection followers',
      description: 'Returns users who follow a given collection.',
    },
    collectionFollowersCount: {
      method: 'GET',
      path: paths.collectionFollowersCount,
      query: GetCollectionFollowersCountParamsSchema,
      responses: { 200: GetFollowCountResponseSchema },
      summary: 'Get collection follower count',
      description: 'Returns the total number of followers for a collection.',
    },
    collectionContributors: {
      method: 'GET',
      path: paths.collectionContributors,
      query: z.object({
        collectionId: z.string(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetCollectionContributorsResponseSchema },
      summary: 'Get collection contributors',
      description: 'Returns users who have added cards to a given collection.',
    },
  },
  { strictStatusCodes: true },
);
