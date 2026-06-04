import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { GraphNodeSchema, GraphEdgeSchema } from '../../entities/graph';

export const GetGraphDataParamsSchema = PaginationParamsSchema;
export type GetGraphDataParams = z.infer<typeof GetGraphDataParamsSchema>;

export const GetGraphDataResponseSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  pagination: PaginationSchema,
});
export type GetGraphDataResponse = z.infer<typeof GetGraphDataResponseSchema>;
