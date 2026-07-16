import { Box, Text } from '@mantine/core';
import { Fragment } from 'react';
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
 * Purely presentational (mock data, no API calls) — same approach as
 * `OrbitalHero`.
 */
export default function KnowledgeTrail() {
  return (
    <Fragment>
      <Box className={styles.trail}>
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
        <div className={styles.finalCard}>
          <TrailUrlCard />
        </div>
      </Box>

      <Text className={styles.finalCaption} fw={600} c="tangerine" ta="center">
        ...and ends up richer than you found it
      </Text>
    </Fragment>
  );
}
