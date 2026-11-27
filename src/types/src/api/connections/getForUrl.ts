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

export const GetConnectionsForUrlParamsSchema =
  PaginatedConnectionSortedParamsSchema.extend({
    url: z.string(),
    direction: z.enum(['forward', 'backward', 'both']).optional(),
    connectionTypes: z.array(ConnectionTypeSchema).optional(),
    // Which endpoint kind anchors a connection to the URL: the URL itself
    // ('URL') or an annotation card on it ('ANNOTATION'). Omitted = both.
    anchorType: z.enum(['URL', 'ANNOTATION']).optional(),
  });
export type GetConnectionsForUrlParams = z.infer<
  typeof GetConnectionsForUrlParamsSchema
>;

export const GetConnectionsForUrlResponseSchema = z.object({
  connections: z.array(ConnectionWithEndpointsAndCuratorSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsForUrlResponse = z.infer<
  typeof GetConnectionsForUrlResponseSchema
>;
