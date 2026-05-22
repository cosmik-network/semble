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
  },
  oauthCallback: {
    method: 'GET',
    path: paths.oauthCallback,
    query: CompleteOAuthSignInRequestSchema,
    responses: { 200: CompleteOAuthSignInResponseSchema },
    summary: 'Complete OAuth sign-in',
    description:
      'Handles the OAuth callback, exchanges the code for tokens, and creates a session.',
  },
  loginWithAppPassword: {
    method: 'POST',
    path: paths.loginWithAppPassword,
    body: LoginWithAppPasswordRequestSchema,
    responses: { 200: LoginWithAppPasswordResponseSchema },
    summary: 'Login with app password',
    description:
      'Authenticates a user with an AT Protocol app password and returns session tokens.',
  },
  refreshToken: {
    method: 'POST',
    path: paths.refreshToken,
    body: RefreshAccessTokenRequestSchema,
    responses: { 200: RefreshAccessTokenResponseSchema },
    summary: 'Refresh access token',
    description: 'Exchanges a refresh token for a new access token.',
  },
  logout: {
    method: 'POST',
    path: paths.logout,
    body: z.object({}),
    responses: { 200: z.object({ success: z.boolean() }) },
    summary: 'Logout',
    description:
      "Invalidates the authenticated user's session and clears auth cookies.",
  },
  extensionTokens: {
    method: 'GET',
    path: paths.extensionTokens,
    query: z.object({}),
    responses: { 200: GenerateExtensionTokensResponseSchema },
    summary: 'Generate extension tokens',
    description:
      'Generates short-lived tokens for use by the browser extension.',
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
});
