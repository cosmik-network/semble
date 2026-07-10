import { CollageTile } from '../../lib/utils/collage';
import { truncateText } from '@/lib/utils/text';

interface Props {
  tiles: CollageTile[];
}

const BOX_WIDTH = 460;
const BOX_HEIGHT = 410;

// Max tiles we render. LAYOUTS must define an arrangement for every count from
// 1 to MAX_TILES.
const MAX_TILES = 5;

type Placement = { top: number; left: number; size: number; rotate: number };

// A balanced, centered arrangement per tile count (1-5) instead of filling a
// fixed path — one card sits centered, two are paired, etc. Fewer cards get
// larger tiles so they fill the space. The last entry in each layout paints on
// top (satori paints in DOM order); we feed text tiles there for readability.
const LAYOUTS: Record<number, Placement[]> = {
  1: [{ top: 85, left: 110, size: 240, rotate: -3 }],
  2: [
    { top: 95, left: 25, size: 200, rotate: -5 },
    { top: 110, left: 235, size: 200, rotate: 5 },
  ],
  3: [
    { top: 15, left: 40, size: 180, rotate: -6 },
    { top: 25, left: 240, size: 180, rotate: 5 },
    { top: 195, left: 140, size: 180, rotate: 3 },
  ],
  4: [
    { top: 10, left: 35, size: 180, rotate: -5 },
    { top: 20, left: 240, size: 180, rotate: 4 },
    { top: 200, left: 25, size: 180, rotate: 4 },
    { top: 195, left: 250, size: 180, rotate: -4 },
  ],
  5: [
    { top: 6, left: 20, size: 180, rotate: -6 },
    { top: 12, left: 255, size: 180, rotate: 5 },
    { top: 200, left: 15, size: 180, rotate: 4 },
    { top: 205, left: 258, size: 180, rotate: -5 },
    { top: 108, left: 138, size: 185, rotate: 2 },
  ],
};

// Shared frame for every tile: white border + soft shadow so rotated tiles read
// as a collage rather than a flat grid.
function frameStyle(size: number) {
  return {
    width: size,
    height: size,
    borderRadius: 18,
    border: '5px solid #ffffff',
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.2)',
    overflow: 'hidden',
    display: 'flex',
  } as const;
}

function renderTile(tile: CollageTile, size: number) {
  const frame = frameStyle(size);
  const pad = size >= 220 ? 24 : 18;
  const textMax = size - pad * 2 - 8;
  const large = size >= 220;

  if (tile.kind === 'image') {
    return (
      <div style={frame}>
        <img
          src={tile.dataUri}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      </div>
    );
  }

  if (tile.kind === 'favicon') {
    return (
      <div
        style={{
          ...frame,
          backgroundColor: '#ffffff',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: pad,
          gap: 12,
        }}
      >
        <img
          src={tile.dataUri}
          width={Math.round(size * 0.3)}
          height={Math.round(size * 0.3)}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <p
            style={{
              fontSize: large ? 26 : 22,
              lineHeight: 1.15,
              color: '#343a40',
              textAlign: 'center',
              margin: 0,
              display: 'block',
              WebkitLineClamp: 2,
              lineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: textMax,
              wordBreak: 'break-word',
            }}
          >
            {truncateText(tile.title, 48)}
          </p>
          <p style={{ fontSize: large ? 18 : 16, color: '#868e96', margin: 0 }}>
            {truncateText(tile.domain, 24)}
          </p>
        </div>
      </div>
    );
  }

  // domain
  return (
    <div
      style={{
        ...frame,
        backgroundColor: '#ffffff',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: pad,
      }}
    >
      <p
        style={{
          fontSize: large ? 32 : 26,
          lineHeight: 1.2,
          color: '#868e96',
          textAlign: 'center',
          margin: 0,
          maxWidth: textMax,
          wordBreak: 'break-word',
        }}
      >
        {truncateText(tile.domain, 28)}
      </p>
    </div>
  );
}

export default function CollectionCollage(props: Props) {
  // Paint image tiles first (background) and text-fallback tiles last, so an
  // overlapping tile on top never obscures readable favicon/domain text.
  const tiles = [...props.tiles]
    .sort((a, b) => (a.kind === 'image' ? 0 : 1) - (b.kind === 'image' ? 0 : 1))
    .slice(0, MAX_TILES);

  if (tiles.length === 0) return null;

  const layout = LAYOUTS[tiles.length];

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
      }}
    >
      {tiles.map((tile, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: layout[i].top,
            left: layout[i].left,
            display: 'flex',
            transform: `rotate(${layout[i].rotate}deg)`,
          }}
        >
          {renderTile(tile, layout[i].size)}
        </div>
      ))}
    </div>
  );
}
