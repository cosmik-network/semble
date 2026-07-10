import { Box } from '@mantine/core';
import classes from './TreeShadows.module.css';

/**
 * Subtle, non-interactive tree-shadow decoration filling the flat "bland gap"
 * between the hero (top 100svh) and the footer. A few blurred foliage
 * silhouettes tucked into the gutters read as soft, dappled shadows cast across
 * the page — the "sunlight through leaves" feel. Confined to the gap via a
 * vertical mask on the shared layer; never interactive.
 */
export default function TreeShadows() {
  return (
    <Box aria-hidden className={classes.layer}>
      {BRANCHES.map((b, i) => (
        <div
          key={i}
          className={`${classes.item} ${b.edge ? classes.itemEdge : ''}`}
          style={{
            ['--x' as string]: b.x,
            ['--y' as string]: b.y,
            ['--w' as string]: `${b.w}px`,
            ['--rot' as string]: `${b.rot}deg`,
            ['--flip' as string]: b.flip ? -1 : 1,
          }}
        >
          <BranchSvg />
        </div>
      ))}
    </Box>
  );
}

// Scattered into the left/right gutters at varied heights, sizes, rotation and
// horizontal flip so no two branches read alike. `edge` ones drop out on small
// screens where the gutters disappear.
const BRANCHES: {
  x: string;
  y: string;
  w: number;
  rot: number;
  flip?: boolean;
  edge?: boolean;
}[] = [
  { x: '0%', y: '22%', w: 1400, rot: -12, edge: true },
  { x: '100%', y: '40%', w: 1560, rot: 8, flip: true, edge: true },
  { x: '4%', y: '52%', w: 1280, rot: 20, edge: true },
  { x: '96%', y: '82%', w: 1160, rot: -6, flip: true },
];

/* Hand-authored foliage silhouette: a curved stem with sub-branches and
   clustered leaf shapes. Rendered with currentColor so the themed .branch tint
   applies; heavily blurred by CSS into a soft dappled shadow. */
function BranchSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className={classes.branch}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* main stem + sub-branches */}
      <path
        d="M6 190 C40 170 58 150 74 120 C86 98 92 78 104 58 C114 40 130 26 150 16
           M74 120 C88 112 104 110 120 112
           M92 78 C78 74 64 76 52 84
           M104 58 C120 56 134 60 146 70
           M120 112 C132 108 142 100 148 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* leaf clusters — small blobs whose gaps become the dappling once blurred */}
      {LEAVES.map(([cx, cy, r], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={r}
          ry={r * 0.62}
          transform={`rotate(${(cx * 7 + cy * 3) % 180} ${cx} ${cy})`}
        />
      ))}
    </svg>
  );
}

// [cx, cy, r] leaf blobs clustered toward branch tips.
const LEAVES: [number, number, number][] = [
  [150, 16, 11],
  [162, 24, 9],
  [138, 22, 8],
  [146, 70, 10],
  [158, 66, 8],
  [136, 80, 7],
  [148, 90, 9],
  [160, 96, 7],
  [120, 112, 10],
  [110, 122, 8],
  [130, 106, 8],
  [52, 84, 10],
  [42, 92, 8],
  [60, 94, 7],
  [104, 58, 8],
  [92, 78, 7],
];
