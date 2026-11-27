import { z } from 'zod';
import { PaginationSchema } from '../../entities/common';
import { CardItemSchema } from '../../entities/card';
import { ConnectionWithSourceAndTargetSchema } from '../../entities/connection';
import { CollectionSchema } from '../../entities/collection';

export const TaggedItemTypeSchema = z.enum([
  'card',
  'connection',
  'collection',
]);
export type TaggedItemType = z.infer<typeof TaggedItemTypeSchema>;

export const GetTaggedItemsParamsSchema = z.object({
  tag: z.string(),
  itemType: TaggedItemTypeSchema.optional(),
  user: z.string().optional(), // DID or handle; filters results to that user
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
export type GetTaggedItemsParams = z.infer<typeof GetTaggedItemsParamsSchema>;

// One entry in the blended reverse-chron list. Tagged cards are URL cards
// (via a tagged NOTE) or annotation cards (via a tagged annotation note).
export const TaggedItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), card: CardItemSchema }),
  z.object({
    type: z.literal('connection'),
    connection: ConnectionWithSourceAndTargetSchema,
  }),
  z.object({ type: z.literal('collection'), collection: CollectionSchema }),
]);
export type TaggedItem = z.infer<typeof TaggedItemSchema>;

// With an itemType filter, exactly one of cards/connections/collections is
// present (and itemType echoes the filter). Without one, `items` holds the
// blended reverse-chron list across all three types.
export const GetTaggedItemsResponseSchema = z.object({
  tag: z.string(),
  itemType: TaggedItemTypeSchema.optional(),
  items: z.array(TaggedItemSchema).optional(),
  cards: z.array(CardItemSchema).optional(),
  connections: z.array(ConnectionWithSourceAndTargetSchema).optional(),
  collections: z.array(CollectionSchema).optional(),
  pagination: PaginationSchema,
});
export type GetTaggedItemsResponse = z.infer<
  typeof GetTaggedItemsResponseSchema
>;
