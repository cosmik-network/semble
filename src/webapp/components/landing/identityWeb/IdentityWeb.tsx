import { Avatar, Text } from '@mantine/core';
import MarginLogo from '@/assets/margin-logo.svg';
import SembleIcon from '@/assets/icon.svg';
import BlueskyIcon from '@/assets/icons/bluesky-icon.svg';
import LeafletIcon from '@/assets/icons/leaflet-icon.png';
import BlackskyLogo from '@/assets/icons/blacksky-logo.svg';
import BlackskyLogoWhite from '@/assets/icons/blacksky-logo-white.svg';
import AnisotaLogo from '@/assets/icons/anisota-logo.svg';
import AnisotaLogoWhite from '@/assets/icons/anisota-logo-white.svg';
import styles from './IdentityWeb.module.css';

/**
 * Decorative "identity convergence" diagram for the ownership section: a single
 * portable identity at the center with dashed lines fanning out to every app
 * that reuses it. On desktop the logos sit in two columns (three left, three
 * right) connected by bezier curves; below the `md` breakpoint it collapses to
 * the identity chip above a simple grid of logo chips.
 */
export default function IdentityWeb({ avatar }: { avatar?: string | null }) {
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
              convergence to a single point). */}
          <path
            className={styles.line}
            d="M450 285 C320 285, 320 112, 200 112"
          />
          <path
            className={styles.line}
            d="M450 310 C320 310, 320 310, 200 310"
          />
          <path
            className={styles.line}
            d="M450 335 C320 335, 320 508, 200 508"
          />
          {/* Right column */}
          <path
            className={styles.line}
            d="M550 285 C680 285, 680 112, 800 112"
          />
          <path
            className={styles.line}
            d="M550 310 C680 310, 680 310, 800 310"
          />
          <path
            className={styles.line}
            d="M550 335 C680 335, 680 508, 800 508"
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
            cy="274"
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
          {/* Top row — lines run up toward the app's label (which sits on the
              center-facing side of the logo), stopping short of it to leave the
              same gap the bottom row's lines leave before their logos. Mirror of
              the bottom row across the avatar (y=274) so both read equal length
              (the bottom lines are visually clipped by their logo chips at
              y≈374, which mirrors the top lines' visible end at y=174). */}
          <path className={styles.line} d="M150 239 C150 207, 55 207, 55 174" />
          <path
            className={styles.line}
            d="M170 239 C170 207, 170 207, 170 174"
          />
          <path
            className={styles.line}
            d="M190 239 C190 207, 285 207, 285 174"
          />
          {/* Bottom row */}
          <path className={styles.line} d="M150 309 C150 358, 55 358, 55 406" />
          <path
            className={styles.line}
            d="M170 309 C170 358, 170 358, 170 406"
          />
          <path
            className={styles.line}
            d="M190 309 C190 358, 285 358, 285 406"
          />
        </g>
      </svg>

      {/* Center: your portable identity */}
      <div className={styles.center}>
        <div className={styles.identityCard}>
          <Avatar
            className={styles.avatar}
            src={avatar ?? undefined}
            variant="filled"
            radius="xl"
            size={'lg'}
            alt="You"
          />
        </div>
      </div>

      {/* App-logo chips. Order maps to .pos0–.pos5 (left column, then right). */}
      <div className={styles.logos}>
        <a
          className={`${styles.node} ${styles.pos0} ${styles.link}`}
          href="https://margin.at"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Margin"
        >
          <div className={styles.chip}>
            <img className={styles.logo} src={MarginLogo.src} alt="Margin" />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Margin
          </Text>
        </a>

        <a
          className={`${styles.node} ${styles.pos1} ${styles.link}`}
          href="https://semble.so"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Semble"
        >
          <div className={styles.chip}>
            <img className={styles.logo} src={SembleIcon.src} alt="Semble" />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Semble
          </Text>
        </a>

        <a
          className={`${styles.node} ${styles.pos2} ${styles.link}`}
          href="https://bsky.app"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Bluesky"
        >
          <div className={styles.chip}>
            <img className={styles.logo} src={BlueskyIcon.src} alt="Bluesky" />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Bluesky
          </Text>
        </a>

        <a
          className={`${styles.node} ${styles.pos3} ${styles.link}`}
          href="https://leaflet.pub"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Leaflet"
        >
          <div className={styles.chip}>
            <img className={styles.logo} src={LeafletIcon.src} alt="Leaflet" />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Leaflet
          </Text>
        </a>

        <a
          className={`${styles.node} ${styles.pos4} ${styles.link}`}
          href="https://blacksky.app"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Blacksky"
        >
          <div className={styles.chip}>
            {/* Blacksky mark swaps for its white variant in dark mode. */}
            <img
              className={`${styles.logo} ${styles.hideOnDark}`}
              src={BlackskyLogo.src}
              alt="Blacksky"
            />
            <img
              className={`${styles.logo} ${styles.hideOnLight}`}
              src={BlackskyLogoWhite.src}
              alt=""
              aria-hidden="true"
            />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Blacksky
          </Text>
        </a>

        <a
          className={`${styles.node} ${styles.pos5} ${styles.link}`}
          href="https://anisota.net"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Anisota"
        >
          <div className={styles.chip}>
            {/* Anisota mark swaps for its white variant in dark mode. */}
            <img
              className={`${styles.logo} ${styles.tall} ${styles.hideOnDark}`}
              src={AnisotaLogo.src}
              alt="Anisota"
            />
            <img
              className={`${styles.logo} ${styles.tall} ${styles.hideOnLight}`}
              src={AnisotaLogoWhite.src}
              alt=""
              aria-hidden="true"
            />
          </div>
          <Text className={styles.label} size="0.65rem" fw={600} c="dimmed">
            Anisota
          </Text>
        </a>
      </div>
    </div>
  );
}
