import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppBskyFeedDefs, type $Typed } from '@atproto/api';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import { blueskyKeys } from '../blueskyKeys';
import { getBlueskyReplies, getBlueskyThread } from '../dal';
import { indexThread } from '../thread';

interface Props {
  url: string;
  enabled: boolean;
}

type Fragment = AppBskyFeedDefs.ThreadViewPost['parent'];

export default function useBlueskyThread(props: Props) {
  const uri = getPostUriFromUrl(props.url);
  const query = useQuery({
    queryKey: blueskyKeys.thread(uri),
    queryFn: () => getBlueskyThread(uri),
    enabled: props.enabled,
    retry: false,
  });

  const [loaded, setLoaded] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const data = query.data;
  const index = useMemo(
    () =>
      data ? indexThread(data.rootUri, [...data.fragments, ...loaded]) : null,
    [data, loaded],
  );

  const hiddenUris = useMemo(() => new Set(data?.hiddenReplies ?? []), [data]);

  const loadMore = async (postUri: string) => {
    if (loading.has(postUri)) return;
    setLoading((prev) => new Set(prev).add(postUri));
    setFailed((prev) => {
      const next = new Set(prev);
      next.delete(postUri);
      return next;
    });
    try {
      const subtree: Fragment | null = await getBlueskyReplies(postUri);
      // Deleted or blocked since the first fetch
      if (!subtree || !AppBskyFeedDefs.isThreadViewPost(subtree)) {
        throw new Error('Replies unavailable');
      }
      const post = subtree as $Typed<AppBskyFeedDefs.ThreadViewPost>;
      // Mark it fetched even with no replies, so the button goes away
      const settled = { ...post, replies: post.replies ?? [] };
      setLoaded((prev) => [...prev, settled]);
    } catch {
      setFailed((prev) => new Set(prev).add(postUri));
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(postUri);
        return next;
      });
    }
  };

  return { query, index, hiddenUris, loadMore, loading, failed };
}

export type BlueskyThreadState = ReturnType<typeof useBlueskyThread>;
