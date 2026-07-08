import { Box } from '@mantine/core';
import styles from './KnowledgeTrail.module.css';
import TrailStop from './TrailStop';
import AvatarStack from './cards/AvatarStack';
import SearchResultsCard from './cards/SearchResultsCard';
import PerspectiveNoteCard from './cards/PerspectiveNoteCard';
import ConnectionsGraph from './cards/ConnectionsGraph';
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
    <Box className={styles.trail}>
      <span className={styles.line} aria-hidden="true" />

      <TrailStop index={1} label="See who shares your interest">
        <AvatarStack />
      </TrailStop>

      <TrailStop index={2} label="Discover relevant content">
        <SearchResultsCard />
      </TrailStop>

      <TrailStop index={3} label="Find new perspectives">
        <PerspectiveNoteCard />
      </TrailStop>

      <TrailStop
        index={4}
        label="Follow the thoughtful connections others have made"
      >
        <ConnectionsGraph />
      </TrailStop>

      <TrailStop index={5} label="Find related collections">
        <TrailCollectionCard />
      </TrailStop>

      <div className={styles.finalCard}>
        <TrailUrlCard />
      </div>
    </Box>
  );
}
