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

export const collectionsContract = c.router({
  myCollections: {
    method: 'GET',
    path: paths.myCollections,
    query: CoercedPaginatedSortedQuery.extend({
      searchText: z.string().optional(),
    }),
    responses: { 200: GetCollectionsResponseSchema },
  },
  createCollection: {
    method: 'POST',
    path: paths.createCollection,
    body: CreateCollectionRequestSchema,
    responses: { 200: CreateCollectionResponseSchema },
  },
  collectionsForUrl: {
    method: 'GET',
    path: paths.collectionsForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
    }),
    responses: { 200: GetCollectionsForUrlResponseSchema },
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
  },
  collectionById: {
    method: 'GET',
    path: paths.collectionById,
    query: CoercedPaginatedSortedQuery.extend({
      collectionId: z.string(),
      urlType: UrlTypeSchema.optional(),
    }),
    responses: { 200: GetCollectionPageResponseSchema },
  },
  updateCollection: {
    method: 'PUT',
    path: paths.updateCollection,
    body: UpdateCollectionRequestSchema,
    responses: { 200: UpdateCollectionResponseSchema },
  },
  // NOTE: browser native fetch drops the body on DELETE requests.
  deleteCollection: {
    method: 'DELETE',
    path: paths.deleteCollection,
    body: DeleteCollectionRequestSchema,
    responses: { 200: DeleteCollectionResponseSchema },
  },
  collectionsByUser: {
    method: 'GET',
    path: paths.collectionsByUser,
    query: CoercedPaginatedSortedQuery.extend({
      identifier: z.string(),
      searchText: z.string().optional(),
    }),
    responses: { 200: GetCollectionsResponseSchema },
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
  },
  openWithContributor: {
    method: 'GET',
    path: paths.openWithContributor,
    query: CoercedPaginatedSortedQuery.extend({
      identifier: z.string(),
    }),
    responses: { 200: GetCollectionsResponseSchema },
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
  },
  collectionFollowersCount: {
    method: 'GET',
    path: paths.collectionFollowersCount,
    query: GetCollectionFollowersCountParamsSchema,
    responses: { 200: GetFollowCountResponseSchema },
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
  },
});
