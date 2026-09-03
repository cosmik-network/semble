import { initContract } from '@ts-rest/core';
import {
  paths,
  GetTagsParamsSchema,
  GetTagsResponseSchema,
  GetTaggedItemsParamsSchema,
  GetTaggedItemsResponseSchema,
} from '@semble/types';

const c = initContract();

export const tagsContract = c.router(
  {
    getTags: {
      method: 'GET',
      path: paths.getTags,
      query: GetTagsParamsSchema,
      responses: { 200: GetTagsResponseSchema },
      summary: 'List recent tags',
      description:
        "Returns recently used #tags for autocomplete. When authenticated, returns the user's recent tags, falling back to recent tags across Semble. Pass `q` to prefix-filter.",
    },
    taggedItems: {
      method: 'GET',
      path: paths.taggedItems,
      query: GetTaggedItemsParamsSchema,
      responses: { 200: GetTaggedItemsResponseSchema },
      summary: 'Get items with a tag',
      description:
        'Returns a paginated, reverse-chronological list of cards, connections, or collections whose note or description contains the given #tag. Filter by `itemType` (default card) and optionally by `user` (handle or DID).',
    },
  },
  { strictStatusCodes: true },
);
