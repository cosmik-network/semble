import type { ConnectionType } from '@semble/types';
import {
  atom,
  getArrowInfo,
  Vec,
  type Atom,
  type Editor,
  type TLArrowShape,
  type TLShape,
  type TLShapeId,
} from 'tldraw';
import { LINK_CARD_TYPE } from '../../model/linkCards';
import type { LinkCardShape } from '../linkCard/LinkCardShapeUtil';

// Kept on an arrow drawn for a server connection. Arrows without it are the
// user's own sketching.
export interface ConnectionArrowMeta {
  connectionId: string;
  connectionType: ConnectionType | null;
  own: boolean;
  // The copies it joins
  from: TLShapeId;
  to: TLShapeId;
}

export function connectionOf(shape: TLShape): ConnectionArrowMeta | null {
  if (shape.type !== 'arrow' || typeof shape.meta.connectionId !== 'string') {
    return null;
  }
  return shape.meta as unknown as ConnectionArrowMeta;
}

export const isConnectionArrow = (shape: TLShape): shape is TLArrowShape =>
  !!connectionOf(shape);

// How the board shows its arrows. Part of the session, never the document.
export interface ArrowSettings {
  // Arrows stay faint until one of their cards is hovered or selected
  focus: Atom<boolean>;
  // Every arrow is hidden, drawn ones too
  hidden: Atom<boolean>;
}

// A new board, or one saved before arrows could be toggled
export const DEFAULT_ARROW_SETTINGS = { focus: true, hidden: false };

const settingsOf = new WeakMap<Editor, ArrowSettings>();

export function arrowSettings(editor: Editor): ArrowSettings {
  let settings = settingsOf.get(editor);
  if (!settings) {
    settings = {
      focus: atom('arrow focus', DEFAULT_ARROW_SETTINGS.focus),
      hidden: atom('arrows hidden', DEFAULT_ARROW_SETTINGS.hidden),
    };
    settingsOf.set(editor, settings);
  }
  return settings;
}

const hidesArrows = (editor: Editor, id: TLShapeId) => {
  const card = editor.getShape(id);
  return (
    card?.type === LINK_CARD_TYPE && (card as LinkCardShape).props.hideArrows
  );
};

// Null when no card is selected; otherwise whether every selected card hides
// its arrows
export function selectedCardsHideArrows(editor: Editor): boolean | null {
  const cards = editor
    .getSelectedShapes()
    .filter((shape): shape is LinkCardShape => shape.type === LINK_CARD_TYPE);
  if (cards.length === 0) return null;
  return cards.every((card) => card.props.hideArrows);
}

// Every arrow hides board-wide; a connection arrow also hides on either card
// it joins. Read reactively by tldraw.
export function getShapeVisibility(shape: TLShape, editor: Editor) {
  if (shape.type !== 'arrow') return 'inherit';
  const connection = connectionOf(shape);
  const hidden =
    arrowSettings(editor).hidden.get() ||
    (!!connection &&
      (hidesArrows(editor, connection.from) ||
        hidesArrows(editor, connection.to)));
  return hidden ? 'hidden' : 'inherit';
}

export interface ArrowDisplay {
  // Full stroke and opacity rather than thin and faint
  strong: boolean;
  pill: boolean;
}

// Focus reads what's hovered and selected, so it writes nothing to the board
export function arrowDisplay(editor: Editor, arrow: TLShape): ArrowDisplay {
  const connection = connectionOf(arrow);
  if (!connection) return { strong: true, pill: false };
  const hovered = editor.getHoveredShapeId();
  const selected = editor.getSelectedShapeIds();
  const touched = [arrow.id, connection.from, connection.to].some(
    (id) => id === hovered || selected.includes(id),
  );
  const strong = touched || !arrowSettings(editor).focus.get();
  // A ghost names its type only on hover or select
  return { strong, pill: connection.own ? strong : touched };
}

// In the arrow's own space
export function arrowMiddle(editor: Editor, arrow: TLArrowShape) {
  const info = getArrowInfo(editor, arrow);
  if (!info) return null;
  return info.type === 'arc'
    ? info.middle
    : Vec.Lrp(info.start.point, info.end.point, 0.5);
}

export interface PillSize {
  w: number;
  h: number;
}

const pillSizesOf = new WeakMap<
  Editor,
  Map<TLShapeId, Atom<PillSize | null>>
>();

// One atom per arrow, so a pill showing redraws only its own arrow's outline
export function pillSize(editor: Editor, arrowId: TLShapeId) {
  let sizes = pillSizesOf.get(editor);
  if (!sizes) {
    sizes = new Map();
    pillSizesOf.set(editor, sizes);
  }
  let size = sizes.get(arrowId);
  if (!size) {
    size = atom('pill size', null);
    sizes.set(arrowId, size);
  }
  return size;
}
