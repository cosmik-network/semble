import { z } from 'zod';
import {
  PaginatedConnectionSortedParamsSchema,
  PaginationSchema,
  ConnectionSortingSchema,
} from '../../entities/common';
import { ConnectionTypeSchema } from '../../entities/connection';
import { AnnotationConnectionViewSchema } from '../../entities/connection';

export const GetConnectionsForAnnotationParamsSchema =
  PaginatedConnectionSortedParamsSchema.extend({
    url: z.string(),
    exact: z.string(),
    connectionTypes: z.array(ConnectionTypeSchema).optional(),
  });
export type GetConnectionsForAnnotationParams = z.infer<
  typeof GetConnectionsForAnnotationParamsSchema
>;

export const GetConnectionsForAnnotationResponseSchema = z.object({
  connections: z.array(AnnotationConnectionViewSchema),
  pagination: PaginationSchema,
  sorting: ConnectionSortingSchema,
});
export type GetConnectionsForAnnotationResponse = z.infer<
  typeof GetConnectionsForAnnotationResponseSchema
>;
