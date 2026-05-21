import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  UrlTypeSchema,
  AddUrlToLibraryRequestSchema,
  AddUrlToLibraryResponseSchema,
  AddCardToLibraryRequestSchema,
  AddCardToLibraryResponseSchema,
  AddCardToCollectionRequestSchema,
  AddCardToCollectionResponseSchema,
  UpdateUrlCardAssociationsRequestSchema,
  UpdateUrlCardAssociationsResponseSchema,
  GetUrlCardsResponseSchema,
  GetUrlMetadataParamsSchema,
  GetUrlMetadataResponseSchema,
  GetUrlStatusForMyLibraryParamsSchema,
  GetUrlStatusForMyLibraryResponseSchema,
  GetLibrariesForUrlParamsSchema,
  GetLibrariesForUrlResponseSchema,
  GetNoteCardsForUrlParamsSchema,
  GetNoteCardsForUrlResponseSchema,
  GetUrlCardViewResponseSchema,
  GetLibrariesForCardResponseSchema,
  UpdateNoteCardRequestSchema,
  UpdateNoteCardResponseSchema,
  RemoveCardFromLibraryRequestSchema,
  RemoveCardFromLibraryResponseSchema,
  RemoveCardFromCollectionRequestSchema,
  RemoveCardFromCollectionResponseSchema,
} from '@semble/types';
import { CoercedPaginatedSortedQuery } from './shared';

const c = initContract();

export const cardsContract = c.router({
  addUrlToLibrary: {
    method: 'POST',
    path: paths.addUrlToLibrary,
    body: AddUrlToLibraryRequestSchema,
    responses: { 200: AddUrlToLibraryResponseSchema },
  },
  addCardToLibrary: {
    method: 'POST',
    path: paths.addCardToLibrary,
    body: AddCardToLibraryRequestSchema,
    responses: { 200: AddCardToLibraryResponseSchema },
  },
  addCardToCollection: {
    method: 'POST',
    path: paths.addCardToCollection,
    body: AddCardToCollectionRequestSchema,
    responses: { 200: AddCardToCollectionResponseSchema },
  },
  urlCardAssociations: {
    method: 'PUT',
    path: paths.urlCardAssociations,
    body: UpdateUrlCardAssociationsRequestSchema,
    responses: { 200: UpdateUrlCardAssociationsResponseSchema },
  },
  myUrlCards: {
    method: 'GET',
    path: paths.myUrlCards,
    query: CoercedPaginatedSortedQuery.extend({
      urlType: UrlTypeSchema.optional(),
      uncollected: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetUrlCardsResponseSchema },
  },
  urlMetadata: {
    method: 'GET',
    path: paths.urlMetadata,
    query: GetUrlMetadataParamsSchema.extend({
      includeStats: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetUrlMetadataResponseSchema },
  },
  urlLibraryStatus: {
    method: 'GET',
    path: paths.urlLibraryStatus,
    query: GetUrlStatusForMyLibraryParamsSchema,
    responses: { 200: GetUrlStatusForMyLibraryResponseSchema },
  },
  librariesForUrl: {
    method: 'GET',
    path: paths.librariesForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
    }),
    responses: { 200: GetLibrariesForUrlResponseSchema },
  },
  noteCardsForUrl: {
    method: 'GET',
    path: paths.noteCardsForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
    }),
    responses: { 200: GetNoteCardsForUrlResponseSchema },
  },
  searchCards: {
    method: 'GET',
    path: paths.searchCards,
    query: CoercedPaginatedSortedQuery.extend({
      searchQuery: z.string(),
      urlType: UrlTypeSchema.optional(),
    }),
    responses: { 200: GetUrlCardsResponseSchema },
  },
  cardById: {
    method: 'GET',
    path: paths.cardById,
    query: z.object({ cardId: z.string() }),
    responses: { 200: GetUrlCardViewResponseSchema },
  },
  cardLibraries: {
    method: 'GET',
    path: paths.cardLibraries,
    query: z.object({ cardId: z.string() }),
    responses: { 200: GetLibrariesForCardResponseSchema },
  },
  cardNote: {
    method: 'PUT',
    path: paths.cardNote,
    body: UpdateNoteCardRequestSchema,
    responses: { 200: UpdateNoteCardResponseSchema },
  },
  removeFromLibrary: {
    method: 'POST',
    path: paths.removeFromLibrary,
    body: RemoveCardFromLibraryRequestSchema,
    responses: { 200: RemoveCardFromLibraryResponseSchema },
  },
  removeFromCollections: {
    method: 'POST',
    path: paths.removeFromCollections,
    body: RemoveCardFromCollectionRequestSchema,
    responses: { 200: RemoveCardFromCollectionResponseSchema },
  },
  cardsByUser: {
    method: 'GET',
    path: paths.cardsByUser,
    query: CoercedPaginatedSortedQuery.extend({
      identifier: z.string(),
      urlType: UrlTypeSchema.optional(),
      uncollected: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetUrlCardsResponseSchema },
  },
});
