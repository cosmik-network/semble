import {
  AppBskyEmbedExternal,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AtUri,
  RichText,
} from '@atproto/api';
import {
  normalizeUrl,
  toReaderLink,
  type ReaderLink,
} from '@/features/reader/lib/utils/readerLink';
import { getPostModerationUI } from './moderation';

type ThreadNode = AppBskyFeedDefs.ThreadViewPost['parent'];

interface EntryBase {
  uri: string;
  parentUri?: string;
  childUris: string[];
  /** A fetch returned this post's full reply list */
  complete: boolean;
}

export type ThreadEntry =
  | (EntryBase & { kind: 'post'; post: AppBskyFeedDefs.PostView })
  | (EntryBase & { kind: 'blocked' | 'notFound' });

export interface ThreadIndex {
  rootUri: string;
  entries: Map<string, ThreadEntry>;
}

export interface TreeNode {
  entry: ThreadEntry;
  children: TreeNode[];
  hasMore: boolean;
}

export interface ThreadView {
  root: TreeNode | null;
  /** Replies the thread author hid, each with its own subtree */
  hidden: TreeNode[];
}

export interface ListItem {
  node: TreeNode;
  parentHandle?: string;
}

export interface ThreadLink extends ReaderLink {
  sources: NonNullable<ReaderLink['sources']>;
}

const NO_UNAUTHENTICATED = '!no-unauthenticated';

function nodeUri(node: ThreadNode): string | null {
  if (AppBskyFeedDefs.isThreadViewPost(node)) return node.post.uri;
  if (AppBskyFeedDefs.isBlockedPost(node)) return node.uri;
  if (AppBskyFeedDefs.isNotFoundPost(node)) return node.uri;
  return null;
}

/**
 * Folds fetched thread fragments (the root's tree, load-more subtrees, the
 * saved post's parent chain) into one index keyed by post URI. Children are
 * unioned, so a fragment that only knows one reply never hides the others.
 */
export function indexThread(
  rootUri: string,
  fragments: ThreadNode[],
): ThreadIndex {
  const entries = new Map<string, ThreadEntry>();

  const upsert = (node: ThreadNode, parentUri?: string): string | null => {
    const uri = nodeUri(node);
    if (!uri) return null;
    const existing = entries.get(uri);

    const base: EntryBase = existing ?? { uri, childUris: [], complete: false };
    base.parentUri ??= parentUri;

    if (AppBskyFeedDefs.isThreadViewPost(node)) {
      entries.set(uri, { ...base, kind: 'post', post: node.post });
    } else if (!existing) {
      entries.set(uri, {
        ...base,
        kind: AppBskyFeedDefs.isBlockedPost(node) ? 'blocked' : 'notFound',
      });
    }
    return uri;
  };

  const addChild = (parentUri: string, childUri: string) => {
    const parent = entries.get(parentUri);
    if (parent && !parent.childUris.includes(childUri)) {
      parent.childUris.push(childUri);
    }
  };

  const visitDown = (node: ThreadNode, parentUri?: string) => {
    const uri = upsert(node, parentUri);
    if (!uri || !AppBskyFeedDefs.isThreadViewPost(node) || !node.replies) {
      return;
    }
    const entry = entries.get(uri);
    if (entry) entry.complete = true;
    for (const reply of node.replies) {
      const childUri = nodeUri(reply);
      if (!childUri) continue;
      addChild(uri, childUri);
      visitDown(reply, uri);
    }
  };

  const visitUp = (node: ThreadNode, childUri: string) => {
    const uri = upsert(node);
    if (!uri) return;
    addChild(uri, childUri);
    const child = entries.get(childUri);
    if (child) child.parentUri ??= uri;
    if (AppBskyFeedDefs.isThreadViewPost(node) && node.parent) {
      visitUp(node.parent, uri);
    }
  };

  for (const fragment of fragments) {
    visitDown(fragment);
    const uri = nodeUri(fragment);
    if (uri && AppBskyFeedDefs.isThreadViewPost(fragment) && fragment.parent) {
      visitUp(fragment.parent, uri);
    }
  }

  return { rootUri, entries };
}

export function isHiddenFromLoggedOut(post: AppBskyFeedDefs.PostView) {
  return !!post.author.labels?.some((l) => l.val === NO_UNAUTHENTICATED);
}

export function postCreatedAt(post: AppBskyFeedDefs.PostView): string {
  const record = post.record as AppBskyFeedPost.Record;
  return record.createdAt ?? post.indexedAt;
}

const likesOf = (node: TreeNode) =>
  node.entry.kind === 'post' ? (node.entry.post.likeCount ?? 0) : -1;
const byLikes = (a: TreeNode, b: TreeNode) => likesOf(b) - likesOf(a);

interface ViewOptions {
  hiddenUris: ReadonlySet<string>;
}

export function buildThreadView(
  index: ThreadIndex,
  options: ViewOptions,
): ThreadView {
  const rootEntry = index.entries.get(index.rootUri);
  if (!rootEntry) return { root: null, hidden: [] };

  const rootAuthor =
    rootEntry.kind === 'post' ? rootEntry.post.author.did : undefined;
  const hidden: TreeNode[] = [];

  const build = (entry: ThreadEntry): TreeNode => {
    const children: TreeNode[] = [];
    const fromAuthor: TreeNode[] = [];
    for (const childUri of entry.childUris) {
      const child = index.entries.get(childUri);
      if (!child) continue;
      const isAuthor =
        child.kind === 'post' && child.post.author.did === rootAuthor;
      const node = build(child);
      if (options.hiddenUris.has(childUri)) {
        hidden.push(node);
      } else if (isAuthor) {
        fromAuthor.push(node);
      } else {
        children.push(node);
      }
    }

    return {
      entry,
      children: [...fromAuthor, ...children.sort(byLikes)],
      hasMore:
        entry.kind === 'post' &&
        !entry.complete &&
        (entry.post.replyCount ?? 0) > 0,
    };
  };

  return { root: build(rootEntry), hidden };
}

/**
 * Numbers the root author's self-thread: the root, then each reply the author
 * made to their own previous post. The total is left off while the chain's
 * tail still has unloaded replies.
 */
export function numberSelfThread(root: TreeNode): Map<string, string> {
  if (root.entry.kind !== 'post') return new Map();
  const authorDid = root.entry.post.author.did;

  const chain = [root];
  for (;;) {
    const next = chain[chain.length - 1].children.find(
      (child) =>
        child.entry.kind === 'post' &&
        child.entry.post.author.did === authorDid,
    );
    if (!next) break;
    chain.push(next);
  }

  const numbers = new Map<string, string>();
  if (chain.length < 2) return numbers;
  const total = chain[chain.length - 1].hasMore ? null : chain.length;
  chain.forEach((node, i) => {
    numbers.set(node.entry.uri, total ? `${i + 1}/${total}` : `${i + 1}`);
  });
  return numbers;
}

/** Every node in a subtree, depth first */
export function walkTree(node: TreeNode): TreeNode[] {
  return [node, ...node.children.flatMap(walkTree)];
}

/** The tree flattened depth first, placeholders included */
export function flattenThread(
  view: ThreadView,
  index: ThreadIndex,
  showHidden: boolean,
): ListItem[] {
  if (!view.root) return [];
  const roots = showHidden ? [view.root, ...view.hidden] : [view.root];
  const items = roots.flatMap(walkTree).map((node) => {
    const parent = node.entry.parentUri
      ? index.entries.get(node.entry.parentUri)
      : undefined;
    return {
      node,
      parentHandle:
        parent?.kind === 'post' ? parent.post.author.handle : undefined,
    };
  });
  return items;
}

function postLinks(post: AppBskyFeedDefs.PostView) {
  const record = post.record as AppBskyFeedPost.Record;
  const links: { href: string; text: string }[] = [];

  const media: unknown = AppBskyEmbedRecordWithMedia.isView(post.embed)
    ? post.embed.media
    : post.embed;
  if (AppBskyEmbedExternal.isView(media)) {
    const { external } = media as AppBskyEmbedExternal.View;
    links.push({ href: external.uri, text: external.title });
  }

  if (record.facets?.length) {
    const rt = new RichText({ text: record.text, facets: record.facets });
    for (const segment of Array.from(rt.segments())) {
      if (segment.isLink() && segment.link?.uri) {
        links.push({ href: segment.link.uri, text: segment.text });
      }
    }
  }

  return links;
}

/** Links shared in the given posts, deduped by URL and credited to each poster */
export function extractThreadLinks(
  posts: AppBskyFeedDefs.PostView[],
  threadUrl: string,
): ThreadLink[] {
  const byUrl = new Map<string, ThreadLink>();

  for (const post of posts) {
    if (
      isHiddenFromLoggedOut(post) ||
      getPostModerationUI(post, 'contentList').filter
    ) {
      continue;
    }
    for (const raw of postLinks(post)) {
      const link = toReaderLink(raw.href, raw.text, threadUrl);
      if (!link) continue;

      const key = normalizeUrl(link.href);
      const existing = byUrl.get(key);
      const source = {
        handle: post.author.handle,
        avatar: post.author.avatar?.replace('avatar', 'avatar_thumbnail'),
        postUri: post.uri,
      };
      if (!existing) {
        byUrl.set(key, { ...link, sources: [source] });
      } else if (!existing.sources.some((s) => s.handle === source.handle)) {
        existing.sources.push(source);
      }
    }
  }

  return Array.from(byUrl.values());
}

const BSKY_ORIGIN = 'https://bsky.app';

/** bsky.app, or blacksky.community for Blacksky threads */
export function postOriginOf(threadUrl: string): string {
  try {
    const { hostname, origin } = new URL(threadUrl);
    return hostname === 'blacksky.community' ? origin : BSKY_ORIGIN;
  } catch {
    return BSKY_ORIGIN;
  }
}

export function getPostUrl(
  post: AppBskyFeedDefs.PostView,
  origin = BSKY_ORIGIN,
): string {
  const rkey = new AtUri(post.uri).rkey;
  return `${origin}/profile/${post.author.handle}/post/${rkey}`;
}
