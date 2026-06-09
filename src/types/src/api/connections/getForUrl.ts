import { z } from 'zod';
import {
  PaginatedConnectionSortedParamsSchema,
  PaginationSchema,
  ConnectionSortingSchema,
} from '../../entities/common';
import {
  ConnectionTypeSchema,
  ConnectionWithSourceAndTargetSchema,
} from '../../entities/connection';

export const GetConnectionsForUrlParamsSchema =
  PaginatedConnectionSortedParamsSchema.extend({
    url: z.string(),
    direction: z.enum(['forward', 'backward', 'both']).optional(),
    connectionTypes: z.array(ConnectionTypeSchema).optional(),
  });
export type GetConnectionsForUrlParams = z.infer<
  typeof GetConnectionsForUrlParamsSchema
>;

export const GetConnectionsForUrlResponseSchema = z.object({
  connections: z.array(ConnectionWithSourceAndTargetSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsForUrlResponse = z.infer<
  typeof GetConnectionsForUrlResponseSchema
>;
