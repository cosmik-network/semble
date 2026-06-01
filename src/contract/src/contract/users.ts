import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  UserSchema,
  GetProfileParamsSchema,
  GetProfileResponseSchema,
  InitiateOAuthSignInRequestSchema,
  InitiateOAuthSignInResponseSchema,
  CompleteOAuthSignInRequestSchema,
  CompleteOAuthSignInResponseSchema,
  LoginWithAppPasswordRequestSchema,
  LoginWithAppPasswordResponseSchema,
  RefreshAccessTokenRequestSchema,
  RefreshAccessTokenResponseSchema,
  GenerateExtensionTokensResponseSchema,
  FollowTargetRequestSchema,
  FollowTargetResponseSchema,
  UnfollowTargetRequestSchema,
  GetFollowingUsersParamsSchema,
  GetFollowingUsersResponseSchema,
  GetFollowersParamsSchema,
  GetFollowersResponseSchema,
  GetFollowingCollectionsParamsSchema,
  GetFollowingCollectionsResponseSchema,
  GetFollowingCountParamsSchema,
  GetFollowersCountParamsSchema,
  GetFollowingCollectionsCountParamsSchema,
  ListApiKeysResponseSchema,
  CreateApiKeyRequestSchema,
  CreateApiKeyResponseSchema,
  UpdateApiKeyRequestSchema,
  UpdateApiKeyResponseSchema,
  RevokeApiKeyRequestSchema,
  RevokeApiKeyResponseSchema,
} from '@semble/types';

const c = initContract();

const CountResponseSchema = z.object({ count: z.number() });

export const usersContract = c.router({
  myProfile: {
    method: 'GET',
    path: paths.myProfile,
    query: z.object({
      includeStats: z.coerce.boolean().optional(),
    }),
    responses: { 200: UserSchema },
    summary: 'Get my profile',
    description: 'Returns the profile of the authenticated user.',
  },
  userProfile: {
    method: 'GET',
    path: paths.userProfile,
    query: GetProfileParamsSchema.extend({
      includeStats: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetProfileResponseSchema },
    summary: 'Get a user profile',
    description:
      'Returns the public profile of a user, identified by handle or DID.',
  },
  initiateOAuth: {
    method: 'GET',
    path: paths.initiateOAuth,
    query: InitiateOAuthSignInRequestSchema,
    responses: { 200: InitiateOAuthSignInResponseSchema },
    summary: 'Initiate OAuth sign-in',
    description:
      'Begins the AT Protocol OAuth flow and returns a redirect URL.',
    metadata: { internal: true } as const,
  },
  oauthCallback: {
    method: 'GET',
    path: paths.oauthCallback,
    query: CompleteOAuthSignInRequestSchema,
    responses: { 200: CompleteOAuthSignInResponseSchema },
    summary: 'Complete OAuth sign-in',
    description:
      'Handles the OAuth callback, exchanges the code for tokens, and creates a session.',
    metadata: { internal: true } as const,
  },
  loginWithAppPassword: {
    method: 'POST',
    path: paths.loginWithAppPassword,
    body: LoginWithAppPasswordRequestSchema,
    responses: { 200: LoginWithAppPasswordResponseSchema },
    summary: 'Login with app password',
    description:
      'Authenticates a user with an AT Protocol app password and returns session tokens.',
    metadata: { internal: true } as const,
  },
  refreshToken: {
    method: 'POST',
    path: paths.refreshToken,
    body: RefreshAccessTokenRequestSchema,
    responses: { 200: RefreshAccessTokenResponseSchema },
    summary: 'Refresh access token',
    description: 'Exchanges a refresh token for a new access token.',
    metadata: { internal: true } as const,
  },
  logout: {
    method: 'POST',
    path: paths.logout,
    body: z.object({}),
    responses: { 200: z.object({ success: z.boolean() }) },
    summary: 'Logout',
    description:
      "Invalidates the authenticated user's session and clears auth cookies.",
    metadata: { internal: true } as const,
  },
  extensionTokens: {
    method: 'GET',
    path: paths.extensionTokens,
    query: z.object({}),
    responses: { 200: GenerateExtensionTokensResponseSchema },
    summary: 'Generate extension tokens',
    description:
      'Generates short-lived tokens for use by the browser extension.',
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
  listApiKeys: {
    method: 'GET',
    path: paths.listApiKeys,
    query: z.object({}),
    responses: { 200: ListApiKeysResponseSchema },
    summary: 'List my API keys',
    description:
      'Returns the API keys belonging to the authenticated user. Token values are never returned after creation; only the prefix is shown.',
    metadata: { internal: true } as const,
  },
  createApiKey: {
    method: 'POST',
    path: paths.createApiKey,
    body: CreateApiKeyRequestSchema,
    responses: { 200: CreateApiKeyResponseSchema },
    summary: 'Create an API key',
    description:
      'Generates a new API key for the authenticated user. The full token is returned in this response only — it cannot be retrieved later.',
    metadata: { internal: true } as const,
  },
  updateApiKey: {
    method: 'POST',
    path: paths.updateApiKey,
    body: UpdateApiKeyRequestSchema,
    responses: { 200: UpdateApiKeyResponseSchema },
    summary: 'Rename an API key',
    description:
      "Updates the human-readable name of one of the user's API keys.",
    metadata: { internal: true } as const,
  },
  revokeApiKey: {
    method: 'POST',
    path: paths.revokeApiKey,
    body: RevokeApiKeyRequestSchema,
    responses: { 200: RevokeApiKeyResponseSchema },
    summary: 'Revoke an API key',
    description:
      'Permanently revokes the specified API key. Subsequent requests using that token will be rejected.',
    metadata: { internal: true } as const,
  },
});
