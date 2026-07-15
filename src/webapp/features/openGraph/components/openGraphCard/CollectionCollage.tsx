import { CollageTile } from '../../lib/utils/collage';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';

interface Props {
  tiles: CollageTile[];
  // Total cards in the collection; when it exceeds the rendered tiles a "+N"
  // badge is overlaid on the stack.
  totalCount?: number;
}

const BOX_WIDTH = 430;
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
//
// Every layout follows the same rules so collections of any size read alike:
// consecutive tiles overlap by 8px (top step = height - 8), the stack is
// centered in BOX_HEIGHT, rotations walk the same -1.1/0.8/-0.6/0.9/-1.1
// sequence, and lefts stay within a 50-55 band.
const LAYOUTS: Record<number, Placement[]> = {
  1: [{ top: 167, left: 53, width: 350, height: 76, rotate: -1.1 }],
  2: [
    { top: 135, left: 53, width: 354, height: 74, rotate: -1.1 },
    { top: 201, left: 50, width: 352, height: 74, rotate: 0.8 },
  ],
  3: [
    { top: 105, left: 53, width: 352, height: 72, rotate: -1.1 },
    { top: 169, left: 50, width: 354, height: 72, rotate: 0.8 },
    { top: 233, left: 55, width: 348, height: 72, rotate: -0.6 },
  ],
  4: [
    { top: 77, left: 53, width: 352, height: 70, rotate: -1.1 },
    { top: 139, left: 50, width: 354, height: 70, rotate: 0.8 },
    { top: 201, left: 55, width: 350, height: 70, rotate: -0.6 },
    { top: 263, left: 51, width: 352, height: 70, rotate: 0.9 },
  ],
  5: [
    { top: 51, left: 53, width: 350, height: 68, rotate: -1.1 },
    { top: 111, left: 50, width: 352, height: 68, rotate: 0.8 },
    { top: 171, left: 55, width: 348, height: 68, rotate: -0.6 },
    { top: 231, left: 51, width: 352, height: 68, rotate: 0.9 },
    { top: 291, left: 53, width: 350, height: 68, rotate: -1.1 },
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
      '0 0 0 1px rgba(15, 23, 42, 0.08), 0 10px 28px rgba(15, 23, 42, 0.28)',
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
  const extraCount = Math.max(0, (props.totalCount ?? 0) - tiles.length);
  const lastPlacement = layout[tiles.length - 1];

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
      {extraCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: lastPlacement.top + lastPlacement.height - 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            padding: '9px 16px',
            borderRadius: 999,
            backgroundColor: '#ffffff',
            boxShadow:
              '0 0 0 1px rgba(15, 23, 42, 0.08), 0 10px 28px rgba(15, 23, 42, 0.28)',
          }}
        >
          <p
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: '#495057',
              margin: 0,
            }}
          >
            +{abbreviateNumber(extraCount)} more
          </p>
        </div>
      )}
    </div>
  );
}
