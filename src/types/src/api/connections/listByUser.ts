import { z } from 'zod';
import {
  PaginatedConnectionSortedParamsSchema,
  PaginationSchema,
  ConnectionSortingSchema,
} from '../../entities/common';
import {
  ConnectionTypeSchema,
  ConnectionWithEndpointsSchema,
} from '../../entities/connection';

export const GetConnectionsParamsSchema =
  PaginatedConnectionSortedParamsSchema.extend({
    identifier: z.string(),
    connectionTypes: z.array(ConnectionTypeSchema).optional(),
  });
export type GetConnectionsParams = z.infer<typeof GetConnectionsParamsSchema>;

export const GetConnectionsResponseSchema = z.object({
  connections: z.array(ConnectionWithEndpointsSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsResponse = z.infer<
  typeof GetConnectionsResponseSchema
>;
