import { z } from 'zod';
import { UserSchema } from './user';
import { CollectionAccessTypeSchema } from './common';

export const CollectionSchema = z.object({
  id: z.string(),
  uri: z.string().optional(),
  name: z.string(),
  author: UserSchema,
  description: z.string().optional(),
  accessType: CollectionAccessTypeSchema.optional(),
  cardCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isFollowing: z.boolean().optional(),
  followerCount: z.number().optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;
