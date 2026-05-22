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
} from '@semble/types';
import { CoercedPaginatedSortedQuery } from './shared';

const c = initContract();

export const connectionsContract = c.router({
  connectionsForUrl: {
    method: 'GET',
    path: paths.connectionsForUrl,
    query: CoercedPaginatedSortedQuery.extend({
      url: z.string(),
      direction: z.enum(['forward', 'backward', 'both']).optional(),
      connectionTypes: z.array(ConnectionTypeSchema).optional(),
    }),
    responses: { 200: GetConnectionsForUrlResponseSchema },
    summary: 'Get connections for a URL',
    description:
      'Returns connections where the given URL is the source or target, optionally filtered by direction and type.',
  },
  createConnection: {
    method: 'POST',
    path: paths.createConnection,
    body: CreateConnectionRequestSchema,
    responses: { 200: CreateConnectionResponseSchema },
    summary: 'Create a connection',
    description: 'Creates a typed link between two URLs or entities.',
  },
  connectionsByUser: {
    method: 'GET',
    path: paths.connectionsByUser,
    query: CoercedPaginatedSortedQuery.extend({
      identifier: z.string(),
      connectionTypes: z.array(ConnectionTypeSchema).optional(),
    }),
    responses: { 200: GetConnectionsResponseSchema },
    summary: "List a user's connections",
    description:
      'Returns a paginated list of connections created by a user, identified by handle or DID.',
  },
  updateConnection: {
    method: 'PUT',
    path: paths.updateConnection,
    body: UpdateConnectionRequestSchema,
    responses: { 200: UpdateConnectionResponseSchema },
    summary: 'Update a connection',
    description: 'Updates the type or note on an existing connection.',
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
});
