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
    summary: 'Get my graph data',
    description:
      "Returns the authenticated user's connection graph as nodes and edges.",
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
    summary: "Get a user's graph data",
    description:
      "Returns a user's connection graph as nodes and edges, identified by handle or DID.",
  },
  urlGraphData: {
    method: 'GET',
    path: paths.urlGraphData,
    query: z.object({
      url: z.string(),
      depth: z.coerce.number().optional(),
    }),
    responses: { 200: GetGraphDataResponseSchema },
    summary: 'Get URL graph data',
    description:
      'Returns the connection graph centered on a given URL, up to the specified depth.',
  },
});
