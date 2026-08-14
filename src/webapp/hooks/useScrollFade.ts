'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Fades whichever edge of a ScrollArea has more content to scroll to. Wire the
 * returned `setViewport` to `ScrollArea`'s `viewportRef`, `updateFade` to its
 * `onScrollPositionChange`, and apply `maskImage` to the viewport. A
 * ResizeObserver tracks viewport/content size changes, so consumers don't
 * need an effect to refresh the fade when content changes.
 */
export function useScrollFade() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const updateFade = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const overflowing = el.scrollHeight > el.clientHeight + 1;
    const atTop = el.scrollTop <= 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    setFadeTop(overflowing && !atTop);
    setFadeBottom(overflowing && !atBottom);
  }, []);

  // Callback ref (rather than an effect) so the observer re-attaches whenever
  // the ScrollArea itself mounts/unmounts, e.g. when conditionally rendered.
  // The returned cleanup (React 19) tears the observer down on unmount.
  // Memoized so consumer re-renders don't detach/re-attach the ref (React
  // re-runs a callback ref whenever its identity changes).
  const setViewport = useCallback(
    (el: HTMLDivElement) => {
      viewportRef.current = el;
      const observer = new ResizeObserver(updateFade);
      // The viewport for its own resizes, the content wrapper for growth
      // (new items, filtering, images loading in). Observing fires an initial
      // measurement, which replaces the old on-mount effect.
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);
      return () => {
        observer.disconnect();
        viewportRef.current = null;
      };
    },
    [updateFade],
  );

  const maskImage = fadeMask(fadeTop, fadeBottom);

  return { setViewport, maskImage, updateFade };
}

/** Builds a vertical mask that fades the top and/or bottom edges. */
function fadeMask(top: boolean, bottom: boolean): string | undefined {
  if (top && bottom) {
    return 'linear-gradient(to bottom, transparent, #000 38px, #000 calc(100% - 38px), transparent)';
  }
  if (top) return 'linear-gradient(to bottom, transparent, #000 38px)';
  if (bottom)
    return 'linear-gradient(to bottom, #000 calc(100% - 38px), transparent)';
  return undefined;
}
