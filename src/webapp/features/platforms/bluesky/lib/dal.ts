import { createSembleClient } from '@/services/client.apiClient';
import { AtpAgent } from '@atproto/api';
import { cache } from 'react';

interface Params {
  limit?: number;
}

export const getBlueskyPost = cache(async (uri: string) => {
  const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

  const post = await agent.getPostThread({
    uri: uri,
    depth: 0,
    parentHeight: 0,
  });

  if (!post.success) {
    throw new Error('Could not load bluesky post');
  }

  return post.data;
});

export const searchBlueskyUsers = cache(
  async (query: string, params?: Params) => {
    const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });
    const res = await agent.searchActorsTypeahead({
      q: query,
      limit: params?.limit ?? 6,
    });

    if (!res.success) {
      throw new Error('Could no search for profiles');
    }

    return res.data.actors;
  },
);

interface SearchParams {
  searchText: string;
}

interface PageParams {
  page?: string;
  limit?: number;
  sortBy?: string;
}

export const searchBlueskyPosts = cache(
  async (params: PageParams & SearchParams) => {
    const client = createSembleClient();
    const response = await client.searchBskyPosts({
      q: params.searchText,
      limit: params?.limit,
      cursor: params.page,
    });

    return response;
  },
);
