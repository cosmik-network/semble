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
    summary: 'Add a URL to library',
    description: "Saves a URL as a card in the authenticated user's library.",
  },
  addCardToLibrary: {
    method: 'POST',
    path: paths.addCardToLibrary,
    body: AddCardToLibraryRequestSchema,
    responses: { 200: AddCardToLibraryResponseSchema },
    summary: 'Add an existing card to library',
    description:
      "Adds an existing card (by ID) to the authenticated user's library.",
    metadata: { internal: true } as const,
  },
  addCardToCollection: {
    method: 'POST',
    path: paths.addCardToCollection,
    body: AddCardToCollectionRequestSchema,
    responses: { 200: AddCardToCollectionResponseSchema },
    summary: 'Add a card to a collection',
    description:
      'Adds a card to a collection the authenticated user can write to.',
    metadata: { internal: true } as const,
  },
  urlCardAssociations: {
    method: 'POST',
    path: paths.urlCardAssociations,
    body: UpdateUrlCardAssociationsRequestSchema,
    responses: { 200: UpdateUrlCardAssociationsResponseSchema },
    summary: 'Update URL card associations',
    description: 'Updates the URL and URL type associations for a card.',
  },
  myUrlCards: {
    method: 'GET',
    path: paths.myUrlCards,
    query: CoercedPaginatedSortedQuery.extend({
      urlType: UrlTypeSchema.optional(),
      uncollected: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetUrlCardsResponseSchema },
    summary: 'List my library cards',
    description:
      "Returns a paginated list of URL cards in the authenticated user's library.",
  },
  urlMetadata: {
    method: 'GET',
    path: paths.urlMetadata,
    query: GetUrlMetadataParamsSchema.extend({
      includeStats: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetUrlMetadataResponseSchema },
    summary: 'Get URL metadata',
    description:
      'Fetches title, description, and other metadata for a given URL.',
  },
  urlLibraryStatus: {
    method: 'GET',
    path: paths.urlLibraryStatus,
    query: GetUrlStatusForMyLibraryParamsSchema,
    responses: { 200: GetUrlStatusForMyLibraryResponseSchema },
    summary: 'Get URL library status',
    description:
      "Returns whether a URL is already saved in the authenticated user's library.",
  },
  librariesForUrl: {
    method: 'GET',
    path: paths.librariesForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
    }),
    responses: { 200: GetLibrariesForUrlResponseSchema },
    summary: 'Get libraries containing a URL',
    description: 'Returns users who have saved a given URL to their library.',
  },
  noteCardsForUrl: {
    method: 'GET',
    path: paths.noteCardsForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
    }),
    responses: { 200: GetNoteCardsForUrlResponseSchema },
    summary: 'Get note cards for a URL',
    description: 'Returns all note cards that are attached to a given URL.',
  },
  searchCards: {
    method: 'GET',
    path: paths.searchCards,
    query: CoercedPaginatedSortedQuery.extend({
      searchQuery: z.string(),
      urlType: UrlTypeSchema.optional(),
    }),
    responses: { 200: GetUrlCardsResponseSchema },
    summary: 'Search cards',
    description: 'Full-text search across card titles and URLs.',
  },
  cardById: {
    method: 'GET',
    path: paths.cardById,
    query: z.object({ cardId: z.string() }),
    responses: { 200: GetUrlCardViewResponseSchema },
    summary: 'Get a card by ID',
    description: 'Returns a card and its associated metadata by card ID.',
  },
  cardLibraries: {
    method: 'GET',
    path: paths.cardLibraries,
    query: z.object({ cardId: z.string() }),
    responses: { 200: GetLibrariesForCardResponseSchema },
    summary: 'Get libraries for a card',
    description:
      'Returns users who have saved a specific card to their library.',
  },
  cardNote: {
    method: 'POST',
    path: paths.cardNote,
    body: UpdateNoteCardRequestSchema,
    responses: { 200: UpdateNoteCardResponseSchema },
    summary: 'Update a note card',
    description: 'Updates the text content of a note card.',
  },
  removeFromLibrary: {
    method: 'POST',
    path: paths.removeFromLibrary,
    body: RemoveCardFromLibraryRequestSchema,
    responses: { 200: RemoveCardFromLibraryResponseSchema },
    summary: 'Remove a card from library',
    description: "Removes a card from the authenticated user's library.",
  },
  removeFromCollections: {
    method: 'POST',
    path: paths.removeFromCollections,
    body: RemoveCardFromCollectionRequestSchema,
    responses: { 200: RemoveCardFromCollectionResponseSchema },
    summary: 'Remove a card from collections',
    description: 'Removes a card from one or more collections.',
    metadata: { internal: true } as const,
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
    summary: "List a user's library cards",
    description:
      "Returns a paginated list of URL cards in a user's library, identified by handle or DID.",
  },
});
