import { RefObject, useEffect, useRef } from 'react';
import { ListDepth } from './pageVisit';

interface Options {
  /** Holds the list's items, each marked with `data-analytics-position` */
  containerRef: RefObject<HTMLElement | null>;
  itemsLoaded: number;
  pagesLoaded: number;
  hasMore: boolean;
  /** The list's type filter. Positions restart when it changes. */
  urlType?: string;
  /** Omitted when nothing should be reported */
  onReport?: (depth: ListDepth) => void;
}

/**
 * Reports how far down an infinite list the visitor got: when the list goes
 * away (unmount, or a filter change that swaps it for another list) and when
 * the page is hidden, which is the last chance on a closed tab. A visitor who
 * comes back and scrolls further is reported again, so take the max per
 * visit_id, tab and url_type.
 */
export default function useListDepth(options: Options) {
  const { containerRef, itemsLoaded, urlType } = options;
  const maxSeen = useRef(0);

  // Kept in an effect rather than during render, so the flush on a filter
  // change still sees the old list
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  // Re-observed as pages load, since each page adds items
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const position = Number(
            (entry.target as HTMLElement).dataset.analyticsPosition,
          );
          if (position > maxSeen.current) maxSeen.current = position;
        }
      },
      { threshold: 0.5 },
    );
    container
      .querySelectorAll('[data-analytics-position]')
      .forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [containerRef, itemsLoaded, urlType]);

  useEffect(() => {
    let reported = -1;

    const flush = () => {
      const { onReport, itemsLoaded, pagesLoaded, hasMore } = latest.current;
      if (!onReport || itemsLoaded === 0 || maxSeen.current <= reported) {
        return;
      }
      reported = maxSeen.current;
      onReport({
        max_position_seen: maxSeen.current,
        items_loaded: itemsLoaded,
        pages_loaded: pagesLoaded,
        reached_end: !hasMore,
        url_type: urlType,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
      maxSeen.current = 0;
    };
  }, [urlType]);
}
