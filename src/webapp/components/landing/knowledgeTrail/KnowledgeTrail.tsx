'use client';

import { Box, Text } from '@mantine/core';
import { Fragment, useEffect, useRef } from 'react';
import styles from './KnowledgeTrail.module.css';
import TrailStop from './TrailStop';
import SharedInterestCard from './cards/SharedInterestCard';
import SearchResultsCard from './cards/SearchResultsCard';
import ConnectionBuilderCard from './cards/ConnectionBuilderCard';
import TrailCollectionCard from './cards/TrailCollectionCard';
import TrailUrlCard from './cards/TrailUrlCard';

/**
 * Decorative "knowledge trail" that flows down from the browser tabs on the
 * landing page: a dashed tangerine line with product-preview cards placed on
 * alternating sides, each introduced by a label, ending in a glowing URL card.
 *
 * The line draws itself as you scroll and each stop fades up on entry. Both are
 * gated on the `data-animate` flag set below, so without JS or with reduced
 * motion the trail renders complete and static.
 *
 * Purely presentational (mock data, no API calls) — same approach as
 * `OrbitalHero`.
 */
export default function KnowledgeTrail() {
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trail = trailRef.current;
    if (!trail) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    trail.dataset.animate = 'true';

    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const rect = trail.getBoundingClientRect();
      // Draw up to 3/4 down the viewport, just ahead of the stop being read.
      const progress = (window.innerHeight * 0.75 - rect.top) / rect.height;
      trail.style.setProperty(
        '--trail-progress',
        String(Math.min(Math.max(progress, 0), 1)),
      );
    };

    const onScroll = () => {
      frame ||= window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Each stop fades up once, as it comes into view.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = 'true';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.25 },
    );

    trail
      .querySelectorAll('[data-trail-reveal]')
      .forEach((el) => observer.observe(el));

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <Fragment>
      <Box className={styles.trail} ref={trailRef}>
        <span className={styles.line} aria-hidden="true" />

        <TrailStop index={1} label="See who shares your interest">
          <SharedInterestCard />
        </TrailStop>

        <TrailStop index={2} label="Discover relevant content">
          <SearchResultsCard />
        </TrailStop>

        <TrailStop index={3} label="Link ideas with meaningful connections">
          <ConnectionBuilderCard />
        </TrailStop>

        <TrailStop index={4} label="Find related collections">
          <TrailCollectionCard />
        </TrailStop>

        {/* The trail (dashed line) ends here at the destination card. The card
            body is opaque, so the line stops behind it — the closing caption
            sits outside `.trail` so no line runs behind it. */}
        <div className={styles.finalCard} data-trail-reveal>
          <TrailUrlCard />
        </div>
      </Box>

      <Text className={styles.finalCaption} fw={600} c="tangerine" ta="center">
        ...and ends up richer than you found it
      </Text>
    </Fragment>
  );
}
