import { Avatar } from '@mantine/core';
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
            cy="260"
            r="150"
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
          {/* Top row — each line meets the center at its own x (no convergence). */}
          <path className={styles.line} d="M150 225 C150 169, 55 169, 55 114" />
          <path
            className={styles.line}
            d="M170 225 C170 169, 170 169, 170 114"
          />
          <path
            className={styles.line}
            d="M190 225 C190 169, 285 169, 285 114"
          />
          {/* Bottom row */}
          <path className={styles.line} d="M150 295 C150 350, 55 350, 55 406" />
          <path
            className={styles.line}
            d="M170 295 C170 350, 170 350, 170 406"
          />
          <path
            className={styles.line}
            d="M190 295 C190 350, 285 350, 285 406"
          />
        </g>
      </svg>

      {/* Center: your portable identity */}
      <div className={styles.center}>
        <div className={styles.identityCard}>
          <Avatar
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
        <div className={`${styles.node} ${styles.pos0}`}>
          <div className={styles.chip}>
            <img className={styles.logo} src={MarginLogo.src} alt="Margin" />
          </div>
        </div>

        <div className={`${styles.node} ${styles.pos1}`}>
          <div className={styles.chip}>
            <img className={styles.logo} src={SembleIcon.src} alt="Semble" />
          </div>
        </div>

        <div className={`${styles.node} ${styles.pos2}`}>
          <div className={styles.chip}>
            <img className={styles.logo} src={BlueskyIcon.src} alt="Bluesky" />
          </div>
        </div>

        <div className={`${styles.node} ${styles.pos3}`}>
          <div className={styles.chip}>
            <img className={styles.logo} src={LeafletIcon.src} alt="Leaflet" />
          </div>
        </div>

        <div className={`${styles.node} ${styles.pos4}`}>
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
        </div>

        <div className={`${styles.node} ${styles.pos5}`}>
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
        </div>
      </div>
    </div>
  );
}
