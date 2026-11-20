import { describe, expect, it } from 'vitest';
import type { $Typed, AppBskyFeedDefs } from '@atproto/api';
import {
  buildThreadView,
  extractThreadLinks,
  flattenThread,
  getPostUrl,
  indexThread,
  postOriginOf,
  walkTree,
  type TreeNode,
} from '@/features/platforms/bluesky/lib/thread';

type Node = $Typed<AppBskyFeedDefs.ThreadViewPost>;

const OP = 'did:plc:op';
const THREAD_URL = 'https://bsky.app/profile/op.test/post/root';

let clock = 0;

function post(
  id: string,
  author = OP,
  extra: {
    text?: string;
    facets?: unknown[];
    embed?: unknown;
    replyCount?: number;
    likeCount?: number;
    labels?: { val: string }[];
  } = {},
): AppBskyFeedDefs.PostView {
  clock += 1;
  return {
    $type: 'app.bsky.feed.defs#postView',
    uri: `at://${author}/app.bsky.feed.post/${id}`,
    cid: id,
    author: {
      did: author,
      handle: `${author.split(':').pop()}.test`,
      labels: extra.labels as never,
    },
    record: {
      $type: 'app.bsky.feed.post',
      text: extra.text ?? id,
      facets: extra.facets,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, clock)).toISOString(),
    },
    embed: extra.embed as never,
    replyCount: extra.replyCount ?? 0,
    likeCount: extra.likeCount ?? 0,
    indexedAt: new Date(0).toISOString(),
  } as AppBskyFeedDefs.PostView;
}

function node(
  p: AppBskyFeedDefs.PostView,
  replies?: Node['replies'],
  parent?: Node['parent'],
): Node {
  return {
    $type: 'app.bsky.feed.defs#threadViewPost',
    post: p,
    replies,
    parent,
  };
}

const uriOf = (n: TreeNode) => n.entry.uri;
const idOf = (uri: string) => uri.split('/').pop();
const ids = (nodes: TreeNode[]) => nodes.map((n) => idOf(uriOf(n)));

const noHidden = new Set<string>();

describe('indexThread / buildThreadView', () => {
  it('orders the author continuation before other replies', () => {
    const root = post('root');
    const other = post('other', 'did:plc:alice');
    const cont = post('cont');
    const index = indexThread(root.uri, [
      node(root, [node(other, []), node(cont, [])]),
    ]);

    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });
    expect(ids(view.root!.children)).toEqual(['cont', 'other']);
  });

  it('orders other replies by likes, keeping author replies first', () => {
    const root = post('root');
    const low = post('low', 'did:plc:alice', { likeCount: 1 });
    const high = post('high', 'did:plc:bob', { likeCount: 9 });
    const cont = post('cont');
    const index = indexThread(root.uri, [
      node(root, [node(low, []), node(cont, []), node(high, [])]),
    ]);

    const view = buildThreadView(index, { hiddenUris: noHidden });
    expect(ids(view.root!.children)).toEqual(['cont', 'high', 'low']);
  });

  it('flags posts whose replies were cut off by depth', () => {
    const root = post('root', OP, { replyCount: 1 });
    const deep = post('deep', OP, { replyCount: 2 });
    const index = indexThread(root.uri, [node(root, [node(deep)])]);

    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });
    expect(view.root!.hasMore).toBe(false);
    expect(view.root!.children[0].hasMore).toBe(true);
  });

  it('merges load-more subtrees without dropping known replies', () => {
    const root = post('root', OP, { replyCount: 1 });
    const mid = post('mid', 'did:plc:alice', { replyCount: 2 });
    const a = post('a', 'did:plc:bob');
    const b = post('b', 'did:plc:carol');

    const index = indexThread(root.uri, [
      node(root, [node(mid)]),
      node(mid, [node(a, []), node(b, [])]),
    ]);
    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });
    const midNode = view.root!.children[0];
    expect(midNode.hasMore).toBe(false);
    expect(ids(midNode.children)).toEqual(['a', 'b']);
  });

  it("grafts a deep reply's parent chain onto the root tree", () => {
    const root = post('root', OP, { replyCount: 2 });
    const sibling = post('sibling', 'did:plc:alice');
    const mid = post('mid', 'did:plc:bob', { replyCount: 1 });
    const leaf = post('leaf', 'did:plc:carol');

    const index = indexThread(root.uri, [
      // Root fetch saw both replies but stopped above the leaf
      node(root, [node(sibling, []), node(mid)]),
      // The saved leaf, fetched with its parents
      node(leaf, [], node(mid, undefined, node(root))),
    ]);
    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });

    expect(ids(view.root!.children)).toEqual(['sibling', 'mid']);
    expect(ids(view.root!.children[1].children)).toEqual(['leaf']);
    expect(index.entries.get(leaf.uri)?.parentUri).toBe(mid.uri);
  });

  it('keeps blocked and deleted posts as placeholders with their replies', () => {
    const root = post('root');
    const reply = post('reply', 'did:plc:alice');
    const index = indexThread(root.uri, [
      node(root, [
        {
          $type: 'app.bsky.feed.defs#blockedPost',
          uri: 'at://x/app.bsky.feed.post/blocked',
          blocked: true,
          author: { did: 'did:plc:x' },
        },
      ]),
      node(reply, [], {
        $type: 'app.bsky.feed.defs#notFoundPost',
        uri: 'at://y/app.bsky.feed.post/gone',
        notFound: true,
      }),
    ]);

    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });
    expect(view.root!.children[0].entry.kind).toBe('blocked');

    const gone = buildThreadView(
      { ...index, rootUri: 'at://y/app.bsky.feed.post/gone' },
      { hiddenUris: noHidden },
    );
    expect(gone.root!.entry.kind).toBe('notFound');
    expect(ids(gone.root!.children)).toEqual(['reply']);
  });

  it('moves hidden replies out of the tree', () => {
    const root = post('root');
    const hidden = post('hidden', 'did:plc:alice');
    const kept = post('kept', 'did:plc:bob');
    const index = indexThread(root.uri, [
      node(root, [node(hidden, []), node(kept, [])]),
    ]);

    const view = buildThreadView(index, {
      hiddenUris: new Set([hidden.uri]),
    });
    expect(ids(view.root!.children)).toEqual(['kept']);
    expect(ids(view.hidden)).toEqual(['hidden']);
  });
});

describe('flattenThread', () => {
  it('lists posts by likes, each followed by its replies', () => {
    const root = post('root');
    const first = post('first', 'did:plc:alice', { likeCount: 5 });
    const second = post('second', 'did:plc:carol', { likeCount: 1 });
    const third = post('third', 'did:plc:bob');
    const index = indexThread(root.uri, [
      node(root, [node(second, []), node(first, [node(third, [])])]),
    ]);
    const view = buildThreadView(index, {
      hiddenUris: noHidden,
    });

    const items = flattenThread(view, index, false);
    expect(items.map((i) => idOf(uriOf(i.node)))).toEqual([
      'root',
      'first',
      'third',
      'second',
    ]);
    expect(items[2].parentHandle).toBe('alice.test');
  });

  it('includes hidden replies only when shown', () => {
    const root = post('root');
    const hidden = post('hidden', 'did:plc:alice');
    const index = indexThread(root.uri, [node(root, [node(hidden, [])])]);
    const view = buildThreadView(index, {
      hiddenUris: new Set([hidden.uri]),
    });

    expect(flattenThread(view, index, false)).toHaveLength(1);
    expect(flattenThread(view, index, true)).toHaveLength(2);
  });
});

describe('flattenThread placeholders', () => {
  it('keeps blocked posts in the list, after the root', () => {
    const root = post('root');
    const index = indexThread(root.uri, [
      node(root, [
        {
          $type: 'app.bsky.feed.defs#blockedPost',
          uri: 'at://x/app.bsky.feed.post/blocked',
          blocked: true,
          author: { did: 'did:plc:x' },
        },
      ]),
    ]);
    const view = buildThreadView(index, { hiddenUris: noHidden });
    const items = flattenThread(view, index, false);
    expect(items.map((i) => i.node.entry.kind)).toEqual(['post', 'blocked']);
  });
});

describe('postOriginOf', () => {
  it('keeps blacksky links on blacksky, everything else on bsky.app', () => {
    const p = post('p');
    expect(
      getPostUrl(
        p,
        postOriginOf('https://blacksky.community/profile/a/post/b'),
      ),
    ).toBe('https://blacksky.community/profile/op.test/post/p');
    expect(getPostUrl(p, postOriginOf(THREAD_URL))).toBe(
      'https://bsky.app/profile/op.test/post/p',
    );
    expect(postOriginOf('not a url')).toBe('https://bsky.app');
  });
});

describe('extractThreadLinks', () => {
  const linkFacet = (text: string, word: string, uri: string) => {
    const bytes = new TextEncoder();
    const start = bytes.encode(text.slice(0, text.indexOf(word))).length;
    return {
      index: { byteStart: start, byteEnd: start + bytes.encode(word).length },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri }],
    };
  };
  const external = (uri: string, title: string) => ({
    $type: 'app.bsky.embed.external#view',
    external: { uri, title, description: '' },
  });

  it('collects facet and link-card links, deduped and credited', () => {
    const text = 'read this — café article';
    const a = post('a', OP, {
      text,
      facets: [linkFacet(text, 'café article', 'https://example.com/post')],
    });
    const b = post('b', 'did:plc:alice', {
      embed: external('https://example.com/post#comments', 'Post'),
    });
    const c = post('c', 'did:plc:bob', {
      embed: external('https://other.com/', 'Other'),
    });

    const links = extractThreadLinks([a, b, c], THREAD_URL);
    expect(links.map((l) => l.href)).toEqual([
      'https://example.com/post',
      'https://other.com/',
    ]);
    expect(links[0].text).toBe('café article');
    expect(links[0].sources.map((s) => s.handle)).toEqual([
      'op.test',
      'alice.test',
    ]);
    expect(links[0].sources[0].postUri).toBe(a.uri);
  });

  it('reads link cards under quote-with-media embeds', () => {
    const p = post('p', OP, {
      embed: {
        $type: 'app.bsky.embed.recordWithMedia#view',
        media: external('https://media.example/', 'Media'),
        record: { record: {} },
      },
    });
    expect(extractThreadLinks([p], THREAD_URL).map((l) => l.href)).toEqual([
      'https://media.example/',
    ]);
  });

  it('skips the thread itself and authors hidden from logged-out viewers', () => {
    const self = post('self', OP, {
      embed: external(THREAD_URL, 'Thread'),
    });
    const optedOut = post('out', 'did:plc:shy', {
      embed: external('https://secret.example/', 'Secret'),
      labels: [{ val: '!no-unauthenticated' }],
    });
    expect(extractThreadLinks([self, optedOut], THREAD_URL)).toEqual([]);
  });

  it('skips posts moderation hides', () => {
    const hidden = {
      ...post('hidden', 'did:plc:mod', {
        embed: external('https://hidden.example/', 'Hidden'),
      }),
      labels: [
        {
          src: 'did:plc:ar7c4by46qjdydhdevvrndac',
          uri: 'at://did:plc:mod/app.bsky.feed.post/hidden',
          val: '!hide',
          cts: new Date(0).toISOString(),
        },
      ],
    };
    expect(extractThreadLinks([hidden], THREAD_URL)).toEqual([]);
  });
});
