import { ImageResponse } from 'next/og';
import { BG_IMAGE_BASE_64, loadGoogleFont } from '../../lib/utils';
import { SembleLogoFull } from './SembleLogo';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';

interface Props {
  name: string;
  linkCount: number;
  author: {
    name: string;
    handle?: string | null;
    avatarUrl?: string | null;
  } | null;
  // The board's saved thumbnail, as a data URL
  thumbnail: string | null;
}

const W = 1200;
const H = 630;

// Where the board's panel starts, and the thumbnail's frame inside it
const PANEL_LEFT = 560;
const PANEL_WIDTH = W - PANEL_LEFT + 40;
const THUMB_WIDTH = 620;
const THUMB_HEIGHT = 510;
const THUMB_INSET = 48;

// The board: an off-white page under a graph-paper grid
const BOARD_BG = '#f8f9fa';
const GRID_LINE = '#e9ecef';
const GRID_GAP = 26;

// Satori tiles neither gradients nor images, so the grid is an SVG pattern
function GridLines() {
  return (
    <svg
      width={PANEL_WIDTH}
      height={H}
      style={{ position: 'absolute', top: 0, left: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="grid"
          width={GRID_GAP}
          height={GRID_GAP}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M 0 0.5 H ${GRID_GAP} M 0.5 0 V ${GRID_GAP}`}
            stroke={GRID_LINE}
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={BOARD_BG} />
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

// The details on the webapp's OG paper at left, and the board on its grid at
// right, running off the card's edges like a window onto the canvas
export default async function CanvasOpenGraph(props: Props) {
  const author = props.author;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundImage: `url(${BG_IMAGE_BASE_64})`,
        backgroundSize: `${W} ${H}`,
        backgroundPosition: 'top left',
        fontFamily: 'Hanken Grotesk',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: PANEL_LEFT,
          width: PANEL_WIDTH,
          height: H,
          display: 'flex',
          overflow: 'hidden',
          backgroundColor: BOARD_BG,
          borderTopLeftRadius: 32,
          borderLeft: '2px solid #e9ecef',
          borderTop: '2px solid #e9ecef',
        }}
      >
        <GridLines />
        {props.thumbnail && (
          <img
            src={props.thumbnail}
            alt=""
            width={THUMB_WIDTH}
            height={THUMB_HEIGHT}
            style={{
              position: 'absolute',
              top: THUMB_INSET,
              left: THUMB_INSET,
              width: THUMB_WIDTH,
              height: THUMB_HEIGHT,
              // The whole board, at any shape: the frame takes tldraw's page
              // color so the margins read as more board
              objectFit: 'contain',
              borderRadius: 16,
              backgroundColor: '#f9fafb',
              border: '2px solid #e9ecef',
              boxShadow:
                '0 2px 6px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.1)',
            }}
          />
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 48,
          bottom: 48,
          width: PANEL_LEFT - 48 * 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <SembleLogoFull width={150} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              color: '#e803ff',
              margin: 0,
            }}
          >
            Canvas
          </p>
          <p
            style={{
              fontSize: 52,
              lineHeight: 1.1,
              color: '#343A40',
              display: 'block',
              lineClamp: 3,
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {props.name}
          </p>
          {props.linkCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 18,
              }}
            >
              {/* MdLink icon */}
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="#15aabf"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
              <p style={{ fontSize: 28, color: '#495057', margin: 0 }}>
                {abbreviateNumber(props.linkCount)}
              </p>
              <p style={{ fontSize: 28, color: '#868e96', margin: 0 }}>
                {props.linkCount > 1 ? 'links' : 'link'}
              </p>
            </div>
          )}
        </div>

        {author ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              maxWidth: '100%',
            }}
          >
            {author.avatarUrl && (
              <img
                src={author.avatarUrl + '@jpeg'}
                width={56}
                height={56}
                alt=""
                style={{ borderRadius: 18, flexShrink: 0 }}
              />
            )}
            <p
              style={{
                color: '#23AFED',
                fontSize: 30,
                lineHeight: 1.2,
                margin: 0,
                // A long handle has no spaces to wrap at
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {author.handle
                ? `@${truncateText(author.handle, 30)}`
                : truncateText(author.name, 30)}
            </p>
          </div>
        ) : (
          // Holds the details in place when there is no author
          <div style={{ display: 'flex' }} />
        )}
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: [
        {
          name: 'Hanken Grotesk',
          data: await loadGoogleFont('Hanken Grotesk'),
          style: 'normal',
        },
      ],
    },
  );
}
