import { Avatar, Text } from '@mantine/core';
import MarginLogo from '@/assets/margin-logo.svg';
import SembleIcon from '@/assets/icon.svg';
import BlueskyIcon from '@/assets/icons/bluesky-icon.svg';
import LeafletIcon from '@/assets/icons/leaflet-icon.webp';
import BlackskyLogo from '@/assets/icons/blacksky-logo.svg';
import BlackskyLogoWhite from '@/assets/icons/blacksky-logo-white.svg';
import AnisotaLogo from '@/assets/icons/anisota-logo.svg';
import AnisotaLogoWhite from '@/assets/icons/anisota-logo-white.svg';
import YouAvatar from '@/assets/avatars/you.svg';
import styles from './IdentityWeb.module.css';

/**
 * Per-app copy and assets. Array order maps to .pos0–.pos5 (mobile: top row
 * then bottom row / desktop: left column top-to-bottom then right column) — if
 * you reorder, keep Semble at index 1 or move the orange `.lineAccent`
 * connector paths to match. The CSS keys unfold direction off these indices
 * too: 0–2 open down on mobile and left on desktop, 3–5 the mirror.
 *
 * `name` is the only always-visible string; keep it to ~9 characters, since it
 * sits in a fixed-width gutter the card leaves clear (see --card-pr in the CSS).
 * `desc`, `tagline` and `description` only appear in the hover card, so they
 * have room to breathe — taglines are quoted from each app's own site.
 */
const APPS = [
  {
    name: 'Margin',
    desc: 'Web annotation',
    tagline: 'Annotate the web using the AT Protocol',
    description:
      'Highlight and discuss passages on any web page, with annotations you own.',
    href: 'https://margin.at',
    logo: MarginLogo,
  },
  {
    name: 'Semble',
    desc: 'Web curation',
    tagline: 'Save what matters, make sense of it together',
    description:
      'A collaborative space for mapping the web, connecting ideas, and building shared knowledge.',
    href: 'https://semble.so',
    logo: SembleIcon,
  },
  {
    name: 'Bluesky',
    desc: 'Social network',
    tagline: 'Social media as it should be',
    description:
      'An open social network where you choose your feeds and can take your followers with you.',
    href: 'https://bsky.app',
    logo: BlueskyIcon,
  },
  {
    name: 'Leaflet',
    desc: 'Publishing',
    tagline: 'Delightful publishing to connect with your community',
    description:
      'Write blogs and newsletters that readers can follow from across the open social web.',
    href: 'https://leaflet.pub',
    logo: LeafletIcon,
  },
  {
    name: 'Blacksky',
    desc: 'Community host',
    tagline: 'AT Protocol Personal Data Server',
    description:
      'Community-run infrastructure that can host your account and data instead of Bluesky.',
    href: 'https://blacksky.app',
    logo: BlackskyLogo,
    logoDark: BlackskyLogoWhite,
  },
  {
    name: 'Anisota',
    desc: 'Bluesky client',
    tagline: 'Anisota for Bluesky & ATProto',
    description:
      'An alternative client for browsing Bluesky — same account and network, different window.',
    href: 'https://anisota.net',
    logo: AnisotaLogo,
    logoDark: AnisotaLogoWhite,
    tall: true,
  },
];

/**
 * The card that unfolds out of a logo on hover / keyboard focus. Collapsed, it
 * is clipped down to exactly the icon's 64px box and faded out, so nothing is
 * painted and no copy can collide with a neighbouring app — the reason the old
 * always-visible description lines had to go: on mobile the columns are only
 * ~113px apart and the two-line labels ran into each other.
 *
 * The app name is NOT in here. It renders outside the card (see `.nameLabel`)
 * so it can stay visible at rest and on top of the open card; the card reserves
 * a clear gutter on its icon side to keep text out from under it.
 *
 * `.cardWrap` is the shadow layer and `.card` the clipped surface: a filter on
 * the parent applies to the already-clipped child, so the shadow hugs the
 * unfolding shape instead of a full invisible rectangle. The icon paints above
 * both, which is what makes the block look like it grows out from behind it.
 *
 * Hidden from assistive tech — the anchor carries an aria-label instead, so a
 * screen reader announces "Margin — Web annotation" rather than every paragraph.
 */
function AppCard({
  desc,
  tagline,
  description,
}: {
  desc: string;
  tagline: string;
  description: string;
}) {
  return (
    <div className={styles.cardWrap} aria-hidden="true">
      <div className={styles.card}>
        <div className={styles.cardBody}>
          <Text className={styles.cardKind} size="0.6rem" fw={600} c="dimmed">
            {desc}
          </Text>
          <Text className={styles.cardTagline} size="xs" fw={700} mt={2}>
            {tagline}
          </Text>
          <Text className={styles.cardDesc} size="xs" mt={4} c="dimmed">
            {description}
          </Text>
        </div>
      </div>
    </div>
  );
}

/**
 * Decorative "identity convergence" diagram for the ownership section: a single
 * portable identity at the center with dashed lines fanning out to every app
 * that reuses it. On desktop the logos sit in two columns (three left, three
 * right) connected by bezier curves; below the `md` breakpoint it collapses to
 * the identity chip with a row of logos above and below. Lines stop short of
 * each mark rather than running into it.
 *
 * Each logo shows its name at rest and unfolds a card with the app's tagline
 * and description on hover / keyboard focus. Cards grow outward — away from the
 * center on desktop, away from the avatar on mobile — so an open card never
 * covers the connector lines or the identity node. The Semble↔you connector is
 * orange to foreground the app this page is about.
 */
export default function IdentityWeb() {
  return (
    <div className={styles.stage}>
      {/* Dashed connector curves (desktop only) */}
      <svg
        className={styles.lines}
        viewBox="0 0 1000 620"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* Fade the lines out as they approach the avatar: transparent at
              center, ramping to opaque out where the logos sit. */}
          <radialGradient
            id="identityFadeDesktop"
            gradientUnits="userSpaceOnUse"
            cx="500"
            cy="310"
            r="230"
          >
            <stop offset="0" stopColor="black" />
            <stop offset="0.4" stopColor="black" />
            <stop offset="0.72" stopColor="white" />
          </radialGradient>
          <mask id="identityFadeMaskDesktop">
            <rect
              x="0"
              y="0"
              width="1000"
              height="620"
              fill="url(#identityFadeDesktop)"
            />
          </mask>
        </defs>
        <g mask="url(#identityFadeMaskDesktop)">
          {/* Left column — each line meets the center at its own height (no
              convergence to a single point). Middle line is Semble's (pos1).
              The outer ends stop 50 units short of each logo center; the SVG
              stretches with the stage (preserveAspectRatio="none"), so that's
              5% of the width at any size and the gap scales with the diagram.
              Nudge that one number to open or close it. */}
          <path
            className={styles.line}
            d="M450 285 C320 285, 320 112, 250 112"
          />
          <path
            className={`${styles.line} ${styles.lineAccent}`}
            d="M450 310 C320 310, 320 310, 250 310"
          />
          <path
            className={styles.line}
            d="M450 335 C320 335, 320 508, 250 508"
          />
          {/* Right column */}
          <path
            className={styles.line}
            d="M550 285 C680 285, 680 112, 750 112"
          />
          <path
            className={styles.line}
            d="M550 310 C680 310, 680 310, 750 310"
          />
          <path
            className={styles.line}
            d="M550 335 C680 335, 680 508, 750 508"
          />
        </g>
      </svg>

      {/* Dashed connector curves (mobile — fan vertically top/bottom) */}
      <svg
        className={styles.linesMobile}
        viewBox="0 0 340 520"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id="identityFadeMobile"
            gradientUnits="userSpaceOnUse"
            cx="170"
            cy="280"
            r="100"
          >
            <stop offset="0" stopColor="black" />
            <stop offset="0.4" stopColor="black" />
            <stop offset="0.72" stopColor="white" />
          </radialGradient>
          <mask id="identityFadeMaskMobile">
            <rect
              x="0"
              y="0"
              width="340"
              height="520"
              fill="url(#identityFadeMobile)"
            />
          </mask>
        </defs>
        <g mask="url(#identityFadeMaskMobile)">
          {/* Top row — ends stop ~40 units below each chip (y=186 against a chip
              bottom edge of y=146), clear of the name label that sits in that
              gap. Middle line is Semble's (pos1). */}
          <path className={styles.line} d="M150 245 C150 215, 55 215, 55 186" />
          <path
            className={`${styles.line} ${styles.lineAccent}`}
            d="M170 245 C170 215, 170 215, 170 186"
          />
          <path
            className={styles.line}
            d="M190 245 C190 215, 285 215, 285 186"
          />
          {/* Bottom row — mirrors the top across the avatar (y=280), ending at
              the chip's top edge (y=374) instead of at the logo center. */}
          <path className={styles.line} d="M150 315 C150 350, 55 350, 55 374" />
          <path
            className={styles.line}
            d="M170 315 C170 350, 170 350, 170 374"
          />
          <path
            className={styles.line}
            d="M190 315 C190 350, 285 350, 285 374"
          />
        </g>
      </svg>

      {/* Center: your portable identity */}
      <div className={styles.center}>
        <Avatar
          className={styles.avatar}
          src={YouAvatar.src}
          variant="filled"
          radius="xl"
          size={'lg'}
          alt="You"
        />
      </div>

      {/* App-logo nodes. The marks are decorative (alt="") and the card is
          aria-hidden, so the anchor's aria-label is its accessible name. Hover
          and focus are read from the anchor, not the icon, so moving the pointer
          into the unfolded card keeps it open. */}
      <div className={styles.logos}>
        {APPS.map((app, i) => (
          <a
            key={app.name}
            className={`${styles.node} ${styles[`pos${i}`]} ${styles.link}`}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${app.name} — ${app.desc}`}
          >
            <AppCard
              desc={app.desc}
              tagline={app.tagline}
              description={app.description}
            />
            <div className={styles.chip}>
              {/* Marks with a `logoDark` swap for their white variant in
                  dark mode. */}
              <img
                className={`${styles.logo} ${app.tall ? styles.tall : ''} ${
                  app.logoDark ? styles.hideOnDark : ''
                }`}
                src={app.logo.src}
                alt=""
              />
              {app.logoDark && (
                <img
                  className={`${styles.logo} ${app.tall ? styles.tall : ''} ${
                    styles.hideOnLight
                  }`}
                  src={app.logoDark.src}
                  alt=""
                />
              )}
            </div>
            {/* Always visible, and painted above the open card. */}
            <Text
              component="span"
              className={styles.nameLabel}
              size="0.6rem"
              fw={600}
              c="dimmed"
            >
              {app.name}
            </Text>
          </a>
        ))}
      </div>
    </div>
  );
}
