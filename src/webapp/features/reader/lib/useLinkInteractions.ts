import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { ReaderLink } from './useReaderLinks';

export interface HoveredLink {
  link: ReaderLink;
  /** Bounding rect of the anchor at hover time (viewport coordinates). */
  rect: DOMRect;
}

const HOVER_OPEN_DELAY = 250;
const HOVER_CLOSE_DELAY = 300;
const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

function linkFromAnchor(anchor: HTMLAnchorElement): ReaderLink | null {
  const href = anchor.getAttribute('href') ?? '';
  if (!/^https?:\/\//i.test(href)) return null;
  return { href, text: anchor.textContent?.trim() || href };
}

/**
 * Delegated link interactions for the reader article (raw HTML, so no
 * per-link React components): hover popover on pointer devices,
 * long-press on touch. Also retargets article links to open in a new
 * tab so navigation doesn't destroy the reader.
 */
export default function useLinkInteractions(
  containerRef: RefObject<HTMLElement | null>,
  content: string,
) {
  const [hovered, setHovered] = useState<HoveredLink | null>(null);
  const [pressedLink, setPressedLink] = useState<ReaderLink | null>(null);

  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Set when a long-press fired, so the resulting click/contextmenu is swallowed
  const suppressNextClick = useRef(false);

  const cancelHoverClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
  }, []);

  const scheduleHoverClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(
      () => setHovered(null),
      HOVER_CLOSE_DELAY,
    );
  }, []);

  const closeHover = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setHovered(null);
  }, []);

  const clearPressedLink = useCallback(() => setPressedLink(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    for (const anchor of Array.from(container.querySelectorAll('a[href]'))) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }

    const findAnchor = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLAnchorElement>('a[href]')
        : null;

    const cancelPress = () => {
      window.clearTimeout(pressTimer.current);
      pressStart.current = null;
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!window.matchMedia('(hover: hover)').matches) return;
      const anchor = findAnchor(e.target);
      if (!anchor) return;
      const link = linkFromAnchor(anchor);
      if (!link) return;

      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      openTimer.current = window.setTimeout(() => {
        setHovered({ link, rect: anchor.getBoundingClientRect() });
      }, HOVER_OPEN_DELAY);
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!findAnchor(e.target)) return;
      window.clearTimeout(openTimer.current);
      scheduleHoverClose();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      const anchor = findAnchor(e.target);
      if (!anchor) return;
      const link = linkFromAnchor(anchor);
      if (!link) return;

      pressStart.current = { x: e.clientX, y: e.clientY };
      window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        pressStart.current = null;
        suppressNextClick.current = true;
        setPressedLink(link);
      }, LONG_PRESS_DURATION);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pressStart.current) return;
      const dx = e.clientX - pressStart.current.x;
      const dy = e.clientY - pressStart.current.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) cancelPress();
    };

    const handleClick = (e: MouseEvent) => {
      if (!suppressNextClick.current) return;
      suppressNextClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Android fires contextmenu on link long-press; keep our sheet instead
      if (pressStart.current || suppressNextClick.current) e.preventDefault();
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', cancelPress);
    container.addEventListener('pointercancel', cancelPress);
    container.addEventListener('click', handleClick);
    container.addEventListener('contextmenu', handleContextMenu);
    // The popover is anchored to viewport coordinates; close it if the
    // article scrolls underneath it (capture catches the nested ScrollArea)
    window.addEventListener('scroll', closeHover, true);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', cancelPress);
      container.removeEventListener('pointercancel', cancelPress);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('scroll', closeHover, true);
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(pressTimer.current);
    };
  }, [containerRef, content, scheduleHoverClose, closeHover]);

  return {
    hovered,
    cancelHoverClose,
    scheduleHoverClose,
    closeHover,
    pressedLink,
    clearPressedLink,
  };
}
