import { z } from 'zod';
import {
  PaginatedConnectionSortedParamsSchema,
  PaginationSchema,
  ConnectionSortingSchema,
} from '../../entities/common';
import {
  ConnectionTypeSchema,
  ConnectionWithEndpointsAndCuratorSchema,
} from '../../entities/connection';

export const GetConnectionsForAnnotationParamsSchema =
  PaginatedConnectionSortedParamsSchema.extend({
    url: z.string(),
    exact: z.string(),
    connectionTypes: z.array(ConnectionTypeSchema).optional(),
  });
export type GetConnectionsForAnnotationParams = z.infer<
  typeof GetConnectionsForAnnotationParamsSchema
>;

// Same shape as GetConnectionsForUrlResponse: full source/target endpoint
// views with the curator. The matching annotation card is always the source
// endpoint; the opposite endpoint is the target.
export const GetConnectionsForAnnotationResponseSchema = z.object({
  connections: z.array(ConnectionWithEndpointsAndCuratorSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsForAnnotationResponse = z.infer<
  typeof GetConnectionsForAnnotationResponseSchema
>;
