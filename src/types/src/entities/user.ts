import { z } from 'zod';

export const LabelSchema = z.object({
  $type: z.literal('com.atproto.label.defs#label').optional(),
  ver: z.number().optional(),
  src: z.string(),
  uri: z.string(),
  cid: z.string().optional(),
  val: z.string(),
  neg: z.boolean().optional(),
  cts: z.string(),
  exp: z.string().optional(),
  sig: z.custom<Uint8Array>((v) => v instanceof Uint8Array).optional(),
});
export type Label = z.infer<typeof LabelSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  description: z.string().optional(),
  isFollowing: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  followsYou: z.boolean().optional(),
  followerCount: z.number().optional(),
  followingCount: z.number().optional(),
  followedCollectionsCount: z.number().optional(),
  urlCardCount: z.number().optional(),
  collectionCount: z.number().optional(),
  connectionCount: z.number().optional(),
  connectionsByType: z
    .object({ total: z.number() })
    .catchall(z.number())
    .optional(),
  labels: z.array(LabelSchema).optional(),
});
export type User = z.infer<typeof UserSchema>;

export const ContributorUserSchema = UserSchema.extend({
  contributionCount: z.number(),
});
export type ContributorUser = z.infer<typeof ContributorUserSchema>;

export const UserProfileDTOSchema = UserSchema.omit({
  isFollowing: true,
  isSubscribed: true,
});
export type UserProfileDTO = z.infer<typeof UserProfileDTOSchema>;

export const MinimalUserProfileSchema = UserProfileDTOSchema.omit({
  description: true,
});
export type MinimalUserProfile = z.infer<typeof MinimalUserProfileSchema>;
