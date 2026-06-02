import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
  ConnectionSortingSchema,
} from '../../entities/common';
import {
  ConnectionTypeSchema,
  ConnectionWithSourceAndTargetSchema,
} from '../../entities/connection';

export const GetConnectionsParamsSchema = PaginatedSortedParamsSchema.extend({
  identifier: z.string(),
  connectionTypes: z.array(ConnectionTypeSchema).optional(),
});
export type GetConnectionsParams = z.infer<typeof GetConnectionsParamsSchema>;

export const GetConnectionsResponseSchema = z.object({
  connections: z.array(ConnectionWithSourceAndTargetSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsResponse = z.infer<
  typeof GetConnectionsResponseSchema
>;
