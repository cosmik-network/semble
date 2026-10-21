import { ConnectionType } from '@semble/types';
import type { TLDefaultColorStyle } from 'tldraw';

export const CARD_TYPE = 'semble-card';
export const CARD_W = 320;
// Starting height; cards resize to their rendered content
export const CARD_H = 120;
export const CARD_W_LARGE = 420;
// Below this zoom cards switch to a title-only view
export const PLACE_GAP = 120;
export const EXPAND_LIMIT = 12;
// Each card in a pile sits this far below and right of the one under it
export const STACK_OFFSET = 10;
// How far apart a hovered pile cascades
export const STACK_FAN_STEP = 64;
export const FLY_IN_MS = 450;
export const HOVER_PREVIEW_DELAY = 500;
export const COLLECTION_DRAG_TYPE = 'application/x-semble-collection';

export const COLLECTION_TYPE = 'semble-collection';

// tldraw only leaves a gap at arrow ends with an arrowhead; shapes pad themselves for the tail end
export const ARROW_TAIL_GAP = 13;
export const COLLECTION_HEADER_H = 64;
export const FRAME_PAD = 32;
export const CARD_GAP = 24;
export const FRAME_MAX_COLS = 3;
export const COLLECTION_SEED_LIMIT = 60;

// Caps how many card URLs we fetch connections for
export const RECONCILE_CAP = 150;

export const CONNECTION_TYPE_COLOR: Record<
  ConnectionType,
  TLDefaultColorStyle
> = {
  RELATED: 'grey',
  SUPPORTS: 'green',
  OPPOSES: 'red',
  ADDRESSES: 'blue',
  HELPFUL: 'light-blue',
  LEADS_TO: 'violet',
  EXPLAINER: 'orange',
  SUPPLEMENT: 'yellow',
  SAME_AS: 'black',
  REFERENCES: 'light-violet',
};
