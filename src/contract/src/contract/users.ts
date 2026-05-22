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
  },
  userProfile: {
    method: 'GET',
    path: paths.userProfile,
    query: GetProfileParamsSchema.extend({
      includeStats: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetProfileResponseSchema },
  },
  initiateOAuth: {
    method: 'GET',
    path: paths.initiateOAuth,
    query: InitiateOAuthSignInRequestSchema,
    responses: { 200: InitiateOAuthSignInResponseSchema },
  },
  oauthCallback: {
    method: 'GET',
    path: paths.oauthCallback,
    query: CompleteOAuthSignInRequestSchema,
    responses: { 200: CompleteOAuthSignInResponseSchema },
  },
  loginWithAppPassword: {
    method: 'POST',
    path: paths.loginWithAppPassword,
    body: LoginWithAppPasswordRequestSchema,
    responses: { 200: LoginWithAppPasswordResponseSchema },
  },
  refreshToken: {
    method: 'POST',
    path: paths.refreshToken,
    body: RefreshAccessTokenRequestSchema,
    responses: { 200: RefreshAccessTokenResponseSchema },
  },
  logout: {
    method: 'POST',
    path: paths.logout,
    body: z.object({}),
    responses: { 200: z.object({ success: z.boolean() }) },
  },
  extensionTokens: {
    method: 'GET',
    path: paths.extensionTokens,
    query: z.object({}),
    responses: { 200: GenerateExtensionTokensResponseSchema },
  },
  followTarget: {
    method: 'POST',
    path: paths.followTarget,
    body: FollowTargetRequestSchema,
    responses: { 200: FollowTargetResponseSchema },
  },
  unfollowTarget: {
    method: 'POST',
    path: paths.unfollowTarget,
    body: UnfollowTargetRequestSchema,
    responses: { 200: z.object({ success: z.boolean() }) },
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
  },
  followingCount: {
    method: 'GET',
    path: paths.followingCount,
    query: GetFollowingCountParamsSchema,
    responses: { 200: CountResponseSchema },
  },
  userFollowersCount: {
    method: 'GET',
    path: paths.userFollowersCount,
    query: GetFollowersCountParamsSchema,
    responses: { 200: CountResponseSchema },
  },
  followingCollectionsCount: {
    method: 'GET',
    path: paths.followingCollectionsCount,
    query: GetFollowingCollectionsCountParamsSchema,
    responses: { 200: CountResponseSchema },
  },
});
