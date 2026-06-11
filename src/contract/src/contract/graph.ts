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
  FollowTargetRequestSchema,
  FollowTargetResponseSchema,
  UnfollowTargetRequestSchema,
  GetFollowingUsersResponseSchema,
  GetFollowersResponseSchema,
  GetFollowingCollectionsResponseSchema,
  GetFollowingCountParamsSchema,
  GetFollowersCountParamsSchema,
  GetFollowingCollectionsCountParamsSchema,
} from '@semble/types';

const c = initContract();

const CountResponseSchema = z.object({ count: z.number() });

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
    followTarget: {
      method: 'POST',
      path: paths.followTarget,
      body: FollowTargetRequestSchema,
      responses: { 200: FollowTargetResponseSchema },
      summary: 'Follow a user or collection',
      description:
        'Follows a target user or collection on behalf of the authenticated user.',
    },
    unfollowTarget: {
      method: 'POST',
      path: paths.unfollowTarget,
      body: UnfollowTargetRequestSchema,
      responses: { 200: z.object({ success: z.boolean() }) },
      summary: 'Unfollow a user or collection',
      description:
        'Removes a follow relationship between the authenticated user and a target.',
    },
    followingUsers: {
      method: 'GET',
      path: paths.followingUsers,
      query: z.object({
        identifier: z.string(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetFollowingUsersResponseSchema },
      summary: 'List users a user follows',
      description:
        'Returns users followed by the specified account, identified by handle or DID.',
    },
    userFollowers: {
      method: 'GET',
      path: paths.userFollowers,
      query: z.object({
        identifier: z.string(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetFollowersResponseSchema },
      summary: "List a user's followers",
      description:
        'Returns users who follow the specified account, identified by handle or DID.',
    },
    followingCollections: {
      method: 'GET',
      path: paths.followingCollections,
      query: z.object({
        identifier: z.string(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: { 200: GetFollowingCollectionsResponseSchema },
      summary: 'List collections a user follows',
      description:
        'Returns collections followed by the specified account, identified by handle or DID.',
    },
    followingCount: {
      method: 'GET',
      path: paths.followingCount,
      query: GetFollowingCountParamsSchema,
      responses: { 200: CountResponseSchema },
      summary: 'Get following count',
      description: 'Returns the number of users a given account follows.',
    },
    userFollowersCount: {
      method: 'GET',
      path: paths.userFollowersCount,
      query: GetFollowersCountParamsSchema,
      responses: { 200: CountResponseSchema },
      summary: 'Get follower count',
      description: 'Returns the number of followers for a given account.',
    },
    followingCollectionsCount: {
      method: 'GET',
      path: paths.followingCollectionsCount,
      query: GetFollowingCollectionsCountParamsSchema,
      responses: { 200: CountResponseSchema },
      summary: 'Get following collections count',
      description: 'Returns the number of collections a given account follows.',
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
