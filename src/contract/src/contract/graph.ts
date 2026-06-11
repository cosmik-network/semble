import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  GetGraphDataResponseSchema,
  SubscribeToTargetRequestSchema,
  SubscribeToTargetResponseSchema,
  UnsubscribeFromTargetRequestSchema,
  UpdateSubscriptionRequestSchema,
  UpdateSubscriptionResponseSchema,
  GetMySubscriptionsParamsSchema,
  GetMySubscriptionsResponseSchema,
} from '@semble/types';

const c = initContract();

export const graphContract = c.router(
  {
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
      metadata: { internal: true } as const,
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
      metadata: { internal: true } as const,
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
      metadata: { internal: true } as const,
    },
    subscribeToTarget: {
      method: 'POST',
      path: paths.subscribeToTarget,
      body: SubscribeToTargetRequestSchema,
      responses: { 200: SubscribeToTargetResponseSchema },
      summary: 'Subscribe to a user or collection',
      description:
        'Marks an existing follow as subscribed for the authenticated user. Requires that the user is already following the target.',
    },
    unsubscribeFromTarget: {
      method: 'POST',
      path: paths.unsubscribeFromTarget,
      body: UnsubscribeFromTargetRequestSchema,
      responses: { 200: z.object({ success: z.boolean() }) },
      summary: 'Unsubscribe from a user or collection',
      description:
        'Clears the subscription flag on an existing follow. Idempotent.',
    },
    updateSubscription: {
      method: 'POST',
      path: paths.updateSubscription,
      body: UpdateSubscriptionRequestSchema,
      responses: { 200: UpdateSubscriptionResponseSchema },
      summary: 'Update the scopes of an existing subscription',
      description:
        'Replaces the scope set on a subscription. Requires the caller to already be subscribed to the target.',
    },
    getMySubscriptions: {
      method: 'GET',
      path: paths.getMySubscriptions,
      query: GetMySubscriptionsParamsSchema.extend({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetMySubscriptionsResponseSchema },
      summary: 'List my subscriptions',
      description:
        "Returns the authenticated user's subscribed users and collections, ordered by subscribedAt DESC.",
    },
  },
  { strictStatusCodes: true },
);
