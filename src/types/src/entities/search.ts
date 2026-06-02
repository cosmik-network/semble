import { z } from 'zod';

export const PostViewSchema = z.object({
  uri: z.string(),
  cid: z.string(),
  author: z.object({
    did: z.string(),
    handle: z.string(),
    displayName: z.string().optional(),
    avatar: z.string().optional(),
    associated: z
      .object({
        chat: z
          .object({
            allowIncoming: z.enum(['all', 'none', 'following']),
          })
          .optional(),
      })
      .optional(),
    viewer: z
      .object({
        muted: z.boolean().optional(),
        blockedBy: z.boolean().optional(),
        blocking: z.string().optional(),
        following: z.string().optional(),
        followedBy: z.string().optional(),
      })
      .optional(),
    labels: z.array(z.any()).optional(),
    createdAt: z.string().optional(),
  }),
  record: z.record(z.string(), z.unknown()),
  embed: z.any().optional(),
  replyCount: z.number().optional(),
  repostCount: z.number().optional(),
  likeCount: z.number().optional(),
  quoteCount: z.number().optional(),
  indexedAt: z.string(),
  viewer: z
    .object({
      repost: z.string().optional(),
      like: z.string().optional(),
      threadMuted: z.boolean().optional(),
      replyDisabled: z.boolean().optional(),
      embeddingDisabled: z.boolean().optional(),
      pinned: z.boolean().optional(),
    })
    .optional(),
  labels: z.array(z.any()).optional(),
  threadgate: z.any().optional(),
});
export type PostView = z.infer<typeof PostViewSchema>;

export const ProfileViewSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  associated: z
    .object({
      chat: z
        .object({
          allowIncoming: z.enum(['all', 'none', 'following']),
        })
        .optional(),
    })
    .optional(),
  indexedAt: z.string().optional(),
  createdAt: z.string().optional(),
  viewer: z
    .object({
      muted: z.boolean().optional(),
      blockedBy: z.boolean().optional(),
      blocking: z.string().optional(),
      following: z.string().optional(),
      followedBy: z.string().optional(),
    })
    .optional(),
  labels: z.array(z.any()).optional(),
  verification: z.any().optional(),
  status: z.any().optional(),
});
export type ProfileView = z.infer<typeof ProfileViewSchema>;
