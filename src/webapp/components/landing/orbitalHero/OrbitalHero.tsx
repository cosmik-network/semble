import { Avatar, Card } from '@mantine/core';
import NotificationActivityStatus from '@/features/notifications/components/notificationActivityStatus/NotificationActivityStatus';
import LinkCardContent from '@/features/cards/components/urlCardContent/LinkCardContent';
import DecorativeSearchBar from './DecorativeSearchBar';
import HeroCollectionCard from './HeroCollectionCard';
import {
  addedCardNotification,
  followNotification,
  linkCardContent,
} from './mockData';
import styles from './OrbitalHero.module.css';

/**
 * Decorative radial hero: a central (non-interactive) search bar surrounded by
 * concentric dashed rings, with real product components floating around it.
 * On desktop the cards are absolutely positioned around the rings; below the
 * `md` breakpoint the layout collapses to a readable vertical stack.
 */
export default function OrbitalHero() {
  return (
    <div className={styles.stage}>
      {/* Decorative concentric rings */}
      <div className={styles.rings} aria-hidden="true">
        <span className={styles.ring} data-ring="1" />
        <span className={styles.ring} data-ring="2" />
        <span className={styles.ring} data-ring="3" />
      </div>

      {/* Center: decorative search bar (static — no float animation) */}
      <div className={`${styles.node} ${styles.center}`}>
        <DecorativeSearchBar />
      </div>

      {/* Top-right: collection card */}
      <div className={`${styles.node} ${styles.nodeCollection}`}>
        <div className={styles.floater} style={{ animationDelay: '0s' }}>
          <HeroCollectionCard />
        </div>
      </div>

      {/* Left: "started following" notification */}
      <div className={`${styles.node} ${styles.nodeFollow}`}>
        <div className={styles.floater} style={{ animationDelay: '-1.6s' }}>
          <NotificationActivityStatus {...followNotification} />
        </div>
      </div>

      {/* Right: standalone avatar */}
      <div className={`${styles.node} ${styles.nodeAvatar}`}>
        <div className={styles.floater} style={{ animationDelay: '-2.8s' }}>
          <Card radius="xl" p={4} withBorder shadow="sm" w="fit-content">
            <Avatar color="blue" variant="filled" radius="xl" size={46}>
              P
            </Avatar>
          </Card>
        </div>
      </div>

      {/* Bottom-left: "added your card" notification */}
      <div className={`${styles.node} ${styles.nodeAdded}`}>
        <div className={styles.floater} style={{ animationDelay: '-3.4s' }}>
          <NotificationActivityStatus {...addedCardNotification} />
        </div>
      </div>

      {/* Bottom-right: link card (faded) */}
      <div className={`${styles.node} ${styles.nodeLink}`}>
        <div className={styles.floater} style={{ animationDelay: '-4.2s' }}>
          <Card withBorder radius="lg" p="md">
            <LinkCardContent cardContent={linkCardContent} />
          </Card>
        </div>
      </div>
    </div>
  );
}
