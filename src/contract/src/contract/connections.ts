import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  ConnectionTypeSchema,
  CreateConnectionRequestSchema,
  CreateConnectionResponseSchema,
  UpdateConnectionRequestSchema,
  UpdateConnectionResponseSchema,
  DeleteConnectionRequestSchema,
  DeleteConnectionResponseSchema,
  GetConnectionsForUrlResponseSchema,
  GetConnectionsResponseSchema,
  GetConnectionsForAnnotationResponseSchema,
} from '@semble/types';
import { CoercedPaginatedConnectionSortedQuery } from './shared';

const c = initContract();

export const connectionsContract = c.router(
  {
    connectionsForUrl: {
      method: 'GET',
      path: paths.connectionsForUrl,
      query: CoercedPaginatedConnectionSortedQuery.extend({
        url: z.string(),
        direction: z.enum(['forward', 'backward', 'both']).optional(),
        connectionTypes: z.array(ConnectionTypeSchema).optional(),
        anchorType: z.enum(['URL', 'ANNOTATION']).optional(),
      }),
      responses: { 200: GetConnectionsForUrlResponseSchema },
      summary: 'Get connections for a URL',
      description:
        'Returns connections where the given URL is the source or target, or where an annotation card anchored on the URL is an endpoint. Optionally filtered by direction, type, and anchorType (URL = direct URL endpoints only, ANNOTATION = annotation-card endpoints only).',
    },
    connectionsForAnnotation: {
      method: 'GET',
      path: paths.connectionsForAnnotation,
      query: CoercedPaginatedConnectionSortedQuery.extend({
        url: z.string(),
        exact: z.string(),
        connectionTypes: z.array(ConnectionTypeSchema).optional(),
      }),
      responses: { 200: GetConnectionsForAnnotationResponseSchema },
      summary: 'Get connections for an annotation',
      description:
        'Returns connections where any annotation card matching a passage is an endpoint, normalized so the matching annotation card is always the source endpoint. Matching is on the URL and the normalized exact text of the TextQuoteSelector.',
    },
    createConnection: {
      method: 'POST',
      path: paths.createConnection,
      body: CreateConnectionRequestSchema,
      responses: { 200: CreateConnectionResponseSchema },
      summary: 'Create a connection',
      description:
        'Creates a typed link between two URLs with an optional note.',
    },
    connectionsByUser: {
      method: 'GET',
      path: paths.connectionsByUser,
      query: CoercedPaginatedConnectionSortedQuery.extend({
        identifier: z.string(),
        connectionTypes: z.array(ConnectionTypeSchema).optional(),
      }),
      responses: { 200: GetConnectionsResponseSchema },
      summary: "List a user's connections",
      description:
        'Returns a paginated list of connections created by a user, identified by handle or DID. Filterable by connection type.',
    },
    updateConnection: {
      method: 'POST',
      path: paths.updateConnection,
      body: UpdateConnectionRequestSchema,
      responses: { 200: UpdateConnectionResponseSchema },
      summary: 'Update a connection',
      description:
        'Updates the type, note, or direction of an existing connection.',
    },
    deleteConnection: {
      method: 'POST',
      path: paths.deleteConnection,
      body: DeleteConnectionRequestSchema,
      responses: { 200: DeleteConnectionResponseSchema },
      summary: 'Delete a connection',
      description:
        'Permanently deletes a connection owned by the authenticated user.',
    },
  },
  { strictStatusCodes: true },
);
