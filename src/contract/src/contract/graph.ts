import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { paths, GetGraphDataResponseSchema } from '@semble/types';

const c = initContract();

export const graphContract = c.router({
  graphData: {
    method: 'GET',
    path: paths.graphData,
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
    responses: { 200: GetGraphDataResponseSchema },
  },
  userGraphData: {
    method: 'GET',
    path: paths.userGraphData,
    query: z.object({
      identifier: z.string(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
    responses: { 200: GetGraphDataResponseSchema },
  },
  urlGraphData: {
    method: 'GET',
    path: paths.urlGraphData,
    query: z.object({
      url: z.string(),
      depth: z.coerce.number().optional(),
    }),
    responses: { 200: GetGraphDataResponseSchema },
  },
});
