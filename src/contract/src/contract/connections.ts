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
  },
  createConnection: {
    method: 'POST',
    path: paths.createConnection,
    body: CreateConnectionRequestSchema,
    responses: { 200: CreateConnectionResponseSchema },
  },
  connectionsByUser: {
    method: 'GET',
    path: paths.connectionsByUser,
    query: CoercedPaginatedSortedQuery.extend({
      identifier: z.string(),
      connectionTypes: z.array(ConnectionTypeSchema).optional(),
    }),
    responses: { 200: GetConnectionsResponseSchema },
  },
  updateConnection: {
    method: 'PUT',
    path: paths.updateConnection,
    body: UpdateConnectionRequestSchema,
    responses: { 200: UpdateConnectionResponseSchema },
  },
  deleteConnection: {
    method: 'POST',
    path: paths.deleteConnection,
    body: DeleteConnectionRequestSchema,
    responses: { 200: DeleteConnectionResponseSchema },
  },
});
