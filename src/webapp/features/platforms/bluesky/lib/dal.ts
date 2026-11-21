import { createSembleClient } from '@/services/client.apiClient';
import {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyFeedThreadgate,
  AtpAgent,
} from '@atproto/api';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

interface Params {
  limit?: number;
}

export const getBlueskyPost = cache(async (uri: string) => {
  const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

  let post;
  try {
    post = await agent.getPostThread({
      uri: uri,
      depth: 0,
      parentHeight: 0,
    });
  } catch (err: any) {
    if (err?.status === 404 || err?.error === 'NotFound') {
      return null;
    }
    throw err;
  }

  if (!post.success) {
    throw new Error('Could not load bluesky post');
  }

  return post.data;
});

const THREAD_DEPTH = 10;

async function fetchPostThread(
  uri: string,
  params: { depth: number; parentHeight: number },
) {
  const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });
  try {
    const res = await agent.getPostThread({ uri, ...params });
    return res.data;
  } catch (err: any) {
    if (err?.status === 404 || err?.error === 'NotFound') return null;
    throw err;
  }
}

export interface BlueskyThread {
  rootUri: string;
  /** The post the page is about, by DID-based URI */
  anchorUri: string;
  fragments: AppBskyFeedDefs.ThreadViewPost['parent'][];
  hiddenReplies: string[];
}

/**
 * The whole conversation around a post: the root's reply tree plus the saved
 * post's own parent chain and replies, so a deep reply is always reachable.
 */
export async function getBlueskyThread(
  uri: string,
): Promise<BlueskyThread | null> {
  const anchor = await fetchPostThread(uri, {
    depth: THREAD_DEPTH,
    parentHeight: 1000,
  });
  if (!anchor || !AppBskyFeedDefs.isThreadViewPost(anchor.thread)) {
    return null;
  }

  const anchorUri = anchor.thread.post.uri;
  const record = anchor.thread.post.record as AppBskyFeedPost.Record;
  const rootUri = record.reply?.root.uri ?? anchorUri;

  const root =
    rootUri === anchorUri
      ? null
      : await fetchPostThread(rootUri, {
          depth: THREAD_DEPTH,
          parentHeight: 0,
        });

  const threadgate = (root ?? anchor).threadgate?.record as
    | AppBskyFeedThreadgate.Record
    | undefined;

  return {
    rootUri,
    anchorUri,
    fragments: root ? [root.thread, anchor.thread] : [anchor.thread],
    hiddenReplies: threadgate?.hiddenReplies ?? [],
  };
}

/** A post's reply subtree, for branches the first fetch cut off */
export async function getBlueskyReplies(uri: string) {
  const res = await fetchPostThread(uri, {
    depth: THREAD_DEPTH,
    parentHeight: 0,
  });
  return res?.thread ?? null;
}

export const getBlueskyProfile = unstable_cache(
  async (handle: string) => {
    const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

    try {
      const res = await agent.getProfile({ actor: handle });
      return res.success ? res.data : null;
    } catch (err: any) {
      if (err?.status === 404 || err?.error === 'NotFound') {
        return null;
      }
      throw err;
    }
  },
  ['bluesky-profile'],
  { revalidate: 86400 },
);

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
  sortBy?: 'latest' | 'top';
}

export const searchBlueskyPosts = cache(
  async (params: PageParams & SearchParams) => {
    const client = createSembleClient();
    const response = await client.searchBskyPosts({
      q: params.searchText,
      limit: params?.limit,
      cursor: params.page,
      sort: params.sortBy,
    });

    return response;
  },
);
