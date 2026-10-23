'use client';

import { FormEvent, MouseEvent, ReactNode, useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import {
  LandingForm,
  startLandingVisit,
  trackLandingFormSubmitted,
  trackLandingLinkClicked,
  trackLandingSectionViewed,
} from '../../lib/analytics';

const SECTION_SELECTOR = '[data-analytics-section]';

// Fine enough steps that a section taller than the screen is still noticed
// once it fills half of it
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);

function sectionOf(el: Element) {
  return (
    el.closest<HTMLElement>(SECTION_SELECTOR)?.dataset.analyticsSection ?? null
  );
}

/**
 * Starts the landing page visit and reports, for everything inside it, which
 * sections are seen, which links are clicked and which forms are sent. Mark
 * sections with `data-analytics-section` and forms with `data-analytics-form`.
 */
export default function LandingVisitTracker(props: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Outlives the observer, which restarts if auth changes mid-visit
  const seenRef = useRef(new Set<string>());
  const { isAuthenticated, isLoading } = useAuth();

  // Waits for auth so is_logged_in is accurate. Sections are observed only
  // once the visit has started, as their reports would be dropped before.
  useEffect(() => {
    const container = containerRef.current;
    if (isLoading || !container) return;

    if (!startedRef.current) {
      startedRef.current = true;
      startLandingVisit({ is_logged_in: isAuthenticated });
    }

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    );
    const seen = seenRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = (entry.target as HTMLElement).dataset
            .analyticsSection!;
          // Half the section in view, or, for one taller than the screen,
          // half the screen taken up by it
          const viewed =
            entry.intersectionRatio >= 0.5 ||
            (!!entry.rootBounds &&
              entry.intersectionRect.height >= entry.rootBounds.height / 2);
          if (!viewed || seen.has(section)) continue;

          seen.add(section);
          trackLandingSectionViewed(
            section,
            sections.indexOf(entry.target as HTMLElement) + 1,
          );
        }
      },
      { threshold: THRESHOLDS },
    );
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [isLoading, isAuthenticated]);

  // React bubbles events out of portals, so links in menus are counted too
  const onClickCapture = (e: MouseEvent) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link) return;

    const url = new URL(link.href);
    const isExternal = url.origin !== window.location.origin;
    trackLandingLinkClicked({
      link: isExternal
        ? url.hostname
        : url.pathname === '/' && url.hash
          ? url.hash
          : url.pathname,
      is_external: isExternal,
      section: sectionOf(link),
    });
  };

  const onSubmitCapture = (e: FormEvent) => {
    const form = (e.target as HTMLElement).dataset.analyticsForm;
    if (!form) return;
    trackLandingFormSubmitted(
      form as LandingForm,
      sectionOf(e.target as Element),
    );
  };

  return (
    <Box
      ref={containerRef}
      onClickCapture={onClickCapture}
      onSubmitCapture={onSubmitCapture}
    >
      {props.children}
    </Box>
  );
}
