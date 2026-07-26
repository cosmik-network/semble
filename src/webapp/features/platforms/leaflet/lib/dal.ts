import { createSembleClient } from '@/services/client.apiClient';
import { AtpAgent } from '@atproto/api';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import {
  BLOG_DOCUMENT_COLLECTION,
  COSMIK_BLOG_DID,
  COSMIK_BLOG_PUBLICATION_URI,
  COSMIK_BLOG_URL,
} from './blog';

interface SearchParams {
  url: string;
  limit?: number;
  cursor?: string;
}

export const searchLeafletDocs = cache(async (params: SearchParams) => {
  const client = createSembleClient();
  const response = await client.searchLeafletDocs({
    url: params.url,
    limit: params?.limit,
    cursor: params.cursor,
  });

  return response;
});

export interface BlogPost {
  title: string;
  description: string | null;
  publishedAt: string;
  url: string;
}

/**
 * `listRecords` lives on the repo's own PDS, so we resolve the DID document
 * rather than hardcoding a host — a PDS can migrate, and a stale hostname would
 * silently empty the blog list.
 */
async function resolvePdsEndpoint(did: string): Promise<string | null> {
  const res = await fetch(`https://plc.directory/${did}`);
  if (!res.ok) return null;

  const doc = (await res.json()) as {
    service?: { id?: string; type?: string; serviceEndpoint?: string }[];
  };
  const pds = doc.service?.find(
    (s) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds',
  );

  return pds?.serviceEndpoint ?? null;
}

function toBlogPost(value: unknown): BlogPost | null {
  const record = value as Record<string, unknown>;
  if (typeof record?.title !== 'string' || typeof record.path !== 'string') {
    return null;
  }
  // The repo holds documents for more than one publication (there's a test one),
  // so the publication URI is what makes a record a post on *this* blog.
  if (record.site !== COSMIK_BLOG_PUBLICATION_URI) return null;
  // Unpublished drafts carry no date, and a future one is scheduled — neither
  // should show up as a recent post.
  if (typeof record.publishedAt !== 'string') return null;
  const published = Date.parse(record.publishedAt);
  if (Number.isNaN(published) || published > Date.now()) return null;

  const description =
    typeof record.description === 'string' && record.description.trim()
      ? record.description.trim()
      : null;
  const path = record.path.startsWith('/') ? record.path : `/${record.path}`;

  return {
    title: record.title,
    description,
    publishedAt: record.publishedAt,
    url: `${COSMIK_BLOG_URL}${path}`,
  };
}

/**
 * Most recent posts from the Cosmik blog, newest first.
 *
 * Record keys are slugs (`updates-june-2026`), so `listRecords`' rkey ordering
 * is alphabetical, not chronological — we read the collection and sort on
 * `publishedAt` ourselves. It's a small repo, so one page covers it.
 *
 * Returns `[]` rather than throwing: this feeds a decorative block on the
 * landing page, and an unreachable PDS shouldn't take the page down with it.
 */
export const getCosmikBlogPosts = unstable_cache(
  async (limit: number): Promise<BlogPost[]> => {
    try {
      const service = await resolvePdsEndpoint(COSMIK_BLOG_DID);
      if (!service) return [];

      const agent = new AtpAgent({ service });
      const res = await agent.com.atproto.repo.listRecords({
        repo: COSMIK_BLOG_DID,
        collection: BLOG_DOCUMENT_COLLECTION,
        limit: 100,
      });

      return res.data.records
        .map((record) => toBlogPost(record.value))
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, limit);
    } catch {
      return [];
    }
  },
  ['cosmik-blog-posts'],
  { revalidate: 3600 },
);
