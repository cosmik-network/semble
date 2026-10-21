import { computed, Computed, createShapeId, Editor, TLShape } from 'tldraw';
import { CARD_TYPE, COLLECTION_TYPE } from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import type { CollectionShape } from '../shapes/collectionShape/CollectionShapeUtil';
import { cardShapeId } from './ids';
import { collectionUrl, nodeKey } from './nodeKey';

export { collectionUrl, nodeKey };

// Anything a connection can start or end at
export type NodeShape = CardShape | CollectionShape;

export const isNodeShape = (
  shape: TLShape | null | undefined,
): shape is NodeShape =>
  shape?.type === CARD_TYPE || shape?.type === COLLECTION_TYPE;

// Null for a collection whose record key isn't known yet
export function getNodeUrl(shape: NodeShape) {
  if (shape.type === CARD_TYPE) return shape.props.url;
  const { authorHandle, rkey } = shape.props;
  return authorHandle && rkey ? collectionUrl(authorHandle, rkey) : null;
}

const indexByEditor = new WeakMap<Editor, Computed<Map<string, NodeShape[]>>>();

// Every card copy and collection on the page by node key, in page order
function getNodeIndex(editor: Editor) {
  let index = indexByEditor.get(editor);
  if (!index) {
    index = computed('node index', () => {
      const result = new Map<string, NodeShape[]>();
      for (const shape of editor.getCurrentPageShapesSorted()) {
        if (!isNodeShape(shape)) continue;
        const url = getNodeUrl(shape);
        if (!url) continue;
        const key = nodeKey(url);
        const list = result.get(key);
        if (list) list.push(shape);
        else result.set(key, [shape]);
      }
      return result;
    });
    indexByEditor.set(editor, index);
  }
  return index.get();
}

export const findNodeShapes = (editor: Editor, url: string) =>
  getNodeIndex(editor).get(nodeKey(url)) ?? [];

// The saved copies of a card on the canvas; suggestions don't count
export const getCardCopies = (editor: Editor, url: string) =>
  findNodeShapes(editor, url).filter(
    (s): s is CardShape => s.type === CARD_TYPE && !s.props.ghost,
  );

// Clear any suggestion for the URL first, or its id stays taken
export const newCardId = (editor: Editor, url: string) =>
  editor.getShape(cardShapeId(url)) ? createShapeId() : cardShapeId(url);

const SHARED_CARD_PROPS = [
  'cardId',
  'title',
  'description',
  'imageUrl',
  'siteName',
  'status',
  'note',
] as const;

// What every copy of a card shows the same; size, position and piles stay per copy
export const sharedCardProps = (card: CardShape) =>
  Object.fromEntries(SHARED_CARD_PROPS.map((k) => [k, card.props[k]])) as Pick<
    CardShape['props'],
    (typeof SHARED_CARD_PROPS)[number]
  >;

export function changedSharedProps(prev: CardShape, next: CardShape) {
  const changed = SHARED_CARD_PROPS.filter(
    (k) => prev.props[k] !== next.props[k],
  );
  return changed.length
    ? (Object.fromEntries(changed.map((k) => [k, next.props[k]])) as Partial<
        CardShape['props']
      >)
    : null;
}
