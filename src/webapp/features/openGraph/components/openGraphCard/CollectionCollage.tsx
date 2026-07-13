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

type Placement = {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate: number;
};

// Rectangular link cards fanned into a loosely-rotated vertical stack. Fewer
// cards get taller tiles so they fill the space. The last entry in each layout
// paints on top (satori paints in DOM order).
const LAYOUTS: Record<number, Placement[]> = {
  1: [{ top: 167, left: 55, width: 350, height: 76, rotate: -1 }],
  2: [
    { top: 131, left: 50, width: 354, height: 74, rotate: -1.5 },
    { top: 207, left: 54, width: 352, height: 74, rotate: 1 },
  ],
  3: [
    { top: 97, left: 54, width: 352, height: 72, rotate: -1.5 },
    { top: 171, left: 48, width: 354, height: 72, rotate: 1 },
    { top: 247, left: 56, width: 348, height: 72, rotate: -1 },
  ],
  4: [
    { top: 64, left: 54, width: 352, height: 70, rotate: -1.5 },
    { top: 136, left: 48, width: 354, height: 70, rotate: 1 },
    { top: 210, left: 56, width: 350, height: 70, rotate: -1 },
    { top: 284, left: 50, width: 352, height: 70, rotate: 1.5 },
  ],
  5: [
    { top: 28, left: 54, width: 350, height: 68, rotate: -1.5 },
    { top: 98, left: 48, width: 352, height: 68, rotate: 1 },
    { top: 170, left: 56, width: 348, height: 68, rotate: -1 },
    { top: 242, left: 50, width: 352, height: 68, rotate: 1 },
    { top: 314, left: 54, width: 350, height: 68, rotate: -1.5 },
  ],
};

// Shared frame for every tile: white mat + hairline border + soft shadow so
// rotated tiles read as a collage rather than a flat grid. The hairline ring
// (first box-shadow) defines the card edge against light backgrounds, matching
// the subtle border on the real UrlCard.
function frameStyle(width: number, height: number) {
  return {
    width,
    height,
    borderRadius: 14,
    border: '3px solid #ffffff',
    boxShadow:
      '0 0 0 1px rgba(15, 23, 42, 0.08), 0 8px 22px rgba(15, 23, 42, 0.2)',
    overflow: 'hidden',
    display: 'flex',
    backgroundColor: '#ffffff',
  } as const;
}

// Each tile is a horizontal link card: a text column (domain + title) on the
// left and a square image/favicon thumbnail on the right.
function renderTile(tile: CollageTile, width: number, height: number) {
  const frame = frameStyle(width, height);
  const large = height >= 72;
  const padV = large ? 4 : 3;
  const padH = large ? 10 : 8;
  const gap = 8;
  // A square thumbnail, inset from the tile edges rather than full-bleed.
  const hasThumb = tile.kind === 'image' || tile.kind === 'favicon';
  const thumb = Math.round(height * 0.55);
  const thumbArea = hasThumb ? thumb + padH + gap : 0;
  const textWidth = width - padH - thumbArea - (hasThumb ? 0 : padH);

  const textBlock = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
        paddingTop: padV,
        paddingBottom: padV,
        paddingLeft: padH,
        paddingRight: hasThumb ? gap : padH,
        gap: 5,
      }}
    >
      <p
        style={{
          fontSize: large ? 15 : 13,
          color: '#868e96',
          margin: 0,
          maxWidth: textWidth,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {truncateText(tile.domain, 30)}
      </p>
      {tile.title && (
        <p
          style={{
            fontSize: large ? 20 : 17,
            lineHeight: 1.2,
            color: '#343a40',
            margin: 0,
            maxWidth: textWidth,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {truncateText(tile.title, 44)}
        </p>
      )}
    </div>
  );

  let thumbBlock = null;
  if (tile.kind === 'image') {
    thumbBlock = (
      <div
        style={{ display: 'flex', alignItems: 'center', paddingRight: padH }}
      >
        <img
          src={tile.dataUri}
          width={thumb}
          height={thumb}
          style={{
            width: thumb,
            height: thumb,
            objectFit: 'cover',
            borderRadius: 8,
          }}
        />
      </div>
    );
  } else if (tile.kind === 'favicon') {
    thumbBlock = (
      <div
        style={{ display: 'flex', alignItems: 'center', paddingRight: padH }}
      >
        <div
          style={{
            display: 'flex',
            width: thumb,
            height: thumb,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f3f5',
            borderRadius: 8,
          }}
        >
          <img
            src={tile.dataUri}
            width={Math.round(thumb * 0.5)}
            height={Math.round(thumb * 0.5)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={frame}>
      {textBlock}
      {thumbBlock}
    </div>
  );
}

export default function CollectionCollage(props: Props) {
  // Order image tiles first so, where the fanned cards overlap, the text-only
  // fallback tiles paint on top and stay readable.
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
          {renderTile(tile, layout[i].width, layout[i].height)}
        </div>
      ))}
    </div>
  );
}
