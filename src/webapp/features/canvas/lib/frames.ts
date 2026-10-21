import {
  Box,
  createShapeId,
  Editor,
  TLFrameShape,
  TLParentId,
  TLShape,
  TLShapeId,
  VecLike,
} from 'tldraw';
import { Collection, UrlCard } from '@semble/types';
import { getRecordKey } from '@/lib/utils/atproto';
import { getCollectionPageById } from '@/features/collections/lib/dal';
import {
  CARD_GAP,
  CARD_H,
  CARD_TYPE,
  CARD_W,
  COLLECTION_HEADER_H,
  COLLECTION_TYPE,
  FRAME_MAX_COLS,
  FRAME_PAD,
} from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import type { CollectionShape } from '../shapes/collectionShape/CollectionShapeUtil';
import { isCardShape, serverWrite } from './arrows';
import { cardShapeId } from './ids';
import { masonryLayout } from './layout';
import { collectionUrl, getNodeUrl, newCardId, NodeShape } from './nodes';

const GRID_OPTS = {
  pad: FRAME_PAD,
  gap: CARD_GAP,
  maxCols: FRAME_MAX_COLS,
  top: COLLECTION_HEADER_H,
  minH: COLLECTION_HEADER_H + CARD_H + FRAME_PAD * 2,
};
// Gives seeded cards time to render and report their real height
const ARRANGE_DELAY_MS = 600;
const ANIMATION = { animation: { duration: 300 } };

export const isFrameShape = (
  shape: TLShape | null | undefined,
): shape is TLFrameShape => shape?.type === 'frame';

export const isCollectionShape = (
  shape: TLShape | null | undefined,
): shape is CollectionShape => shape?.type === COLLECTION_TYPE;

export function getCollectionIdOfParent(editor: Editor, parentId: TLParentId) {
  const parent = editor.getShape(parentId as TLShapeId);
  return isCollectionShape(parent) ? parent.props.collectionId : undefined;
}

export function findCollectionShape(editor: Editor, collectionId: string) {
  return editor
    .getCurrentPageShapes()
    .find(
      (s): s is CollectionShape =>
        isCollectionShape(s) && s.props.collectionId === collectionId,
    );
}

const getChildCards = (editor: Editor, parentId: TLShapeId) =>
  editor
    .getSortedChildIdsForParent(parentId)
    .map((id) => editor.getShape(id))
    .filter((s): s is CardShape => s?.type === CARD_TYPE);

type CollectionData = Omit<
  CollectionShape['props'],
  'w' | 'h' | 'collapsed' | 'expandedH'
>;

export const collectionProps = (
  collection: Collection,
  userId: string,
): CollectionData => ({
  collectionId: collection.id,
  name: collection.name,
  description: collection.description ?? '',
  accessType: collection.accessType ?? 'CLOSED',
  authorHandle: collection.author.handle,
  authorAvatarUrl: collection.author.avatarUrl ?? '',
  rkey: collection.uri ? getRecordKey(collection.uri) : '',
  readOnly: collection.author.id !== userId && collection.accessType !== 'OPEN',
});

export const collectionPath = (handle: string, rkey: string) =>
  `/profile/${handle}/collections/${rkey}`;

// Someone else's card is not in the user's library, and their note isn't the user's
export const cardPropsFromUrlCard = (card: UrlCard, userId: string) => ({
  url: card.url,
  cardId: card.author.id === userId ? card.id : '',
  title: card.cardContent.title ?? '',
  description: card.cardContent.description ?? '',
  imageUrl: card.cardContent.imageUrl ?? '',
  siteName: card.cardContent.siteName ?? '',
  note: card.author.id === userId ? (card.note?.text ?? '') : '',
  status: 'ready' as const,
});

const scheduleArrange = (editor: Editor, id: TLShapeId) =>
  editor.timers.setTimeout(() => {
    arrangeCollection(editor, id);
    if (editor.getSelectedShapeIds().includes(id)) {
      editor.zoomToSelection(ANIMATION);
    }
  }, ARRANGE_DELAY_MS);

// Places a collection with its cards; cards already elsewhere on the canvas get a copy inside
export function placeCollection(
  editor: Editor,
  collection: Collection,
  cards: UrlCard[],
  userId: string,
  point?: VecLike,
) {
  const existing = findCollectionShape(editor, collection.id);
  if (existing) {
    editor.select(existing.id);
    editor.zoomToSelection(ANIMATION);
    return;
  }

  const grid = masonryLayout(
    cards.map(() => CARD_H),
    CARD_W,
    GRID_OPTS,
  );

  const content = editor.getCurrentPageBounds();
  const center = editor.getViewportPageBounds().center;
  const origin = point
    ? { x: point.x - grid.w / 2, y: point.y - COLLECTION_HEADER_H / 2 }
    : content
      ? { x: content.maxX + 160, y: content.minY }
      : { x: center.x - grid.w / 2, y: center.y - grid.h / 2 };

  const id = createShapeId();
  serverWrite(editor, () => {
    editor.createShape<CollectionShape>({
      id,
      type: COLLECTION_TYPE,
      x: origin.x,
      y: origin.y,
      props: {
        w: grid.w,
        h: grid.h,
        expandedH: grid.h,
        ...collectionProps(collection, userId),
      },
    });

    cards.forEach((card, i) => {
      const suggestion = editor.getShape(cardShapeId(card.url));
      if (isCardShape(suggestion) && suggestion.props.ghost) {
        editor.deleteShape(suggestion.id);
      }
      editor.createShape({
        id: newCardId(editor, card.url),
        type: CARD_TYPE,
        parentId: id,
        ...grid.slots[i],
        props: cardPropsFromUrlCard(card, userId),
      });
    });
  });

  editor.select(id);
  editor.zoomToSelection(ANIMATION);
  scheduleArrange(editor, id);
}

// Swaps a drawn frame for a collection container holding the same cards
export function convertFrameToCollection(
  editor: Editor,
  frameId: TLShapeId,
  data: CollectionData,
) {
  const frame = editor.getShape(frameId);
  if (!isFrameShape(frame)) return null;

  const id = createShapeId();
  serverWrite(editor, () => {
    editor.createShape<CollectionShape>({
      id,
      type: COLLECTION_TYPE,
      parentId: frame.parentId,
      x: frame.x,
      y: frame.y,
      props: {
        w: frame.props.w,
        h: frame.props.h,
        expandedH: frame.props.h,
        ...data,
      },
    });
    const children = editor.getSortedChildIdsForParent(frameId);
    if (children.length) editor.reparentShapes(children, id);
    editor.deleteShape(frameId);
  });

  editor.select(id);
  arrangeCollection(editor, id);
  return id;
}

// Re-packs a collection's cards by their rendered heights and fits it to them
export function arrangeCollection(editor: Editor, id: TLShapeId) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape) || shape.props.collapsed) return;
  const cards = getChildCards(editor, id);
  const grid = masonryLayout(
    cards.map((c) => c.props.h),
    CARD_W,
    GRID_OPTS,
  );

  serverWrite(editor, () => {
    cards.forEach((card, i) =>
      editor.updateShape({
        id: card.id,
        type: CARD_TYPE,
        ...grid.slots[i],
        props: { stackId: '' },
      }),
    );
    editor.updateShape<CollectionShape>({
      id,
      type: COLLECTION_TYPE,
      props: { w: grid.w, h: grid.h, expandedH: grid.h },
    });
  });
}

export function toggleCollapsed(editor: Editor, id: TLShapeId) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape)) return;
  const collapsed = !shape.props.collapsed;
  editor.markHistoryStoppingPoint('toggle collection');
  editor.run(
    () =>
      editor.updateShape<CollectionShape>({
        id,
        type: COLLECTION_TYPE,
        props: collapsed
          ? { collapsed, expandedH: shape.props.h, h: COLLECTION_HEADER_H }
          : { collapsed, h: shape.props.expandedH },
      }),
    { ignoreShapeLock: true },
  );
}

// Hides the cards of collapsed collections and the arrows that touch them
export function isHiddenByCollapse(editor: Editor, shape: TLShape) {
  if (shape.type === 'arrow') {
    return editor
      .getBindingsFromShape(shape.id, 'arrow')
      .some((b) => isInCollapsed(editor, b.toId));
  }
  return isInCollapsed(editor, shape.id);
}

const isInCollapsed = (editor: Editor, id: TLShapeId) => {
  const shape = editor.getShape(id);
  const parent = shape && editor.getShape(shape.parentId as TLShapeId);
  return isCollectionShape(parent) && parent.props.collapsed;
};

// Grows a card's container when the card's rendered size no longer fits inside it
export function fitContainerToCard(editor: Editor, card: CardShape) {
  const parent = editor.getShape(card.parentId as TLShapeId);
  if (!isFrameShape(parent) && !isCollectionShape(parent)) return;
  if (isCollectionShape(parent) && parent.props.collapsed) return;
  const w = Math.max(parent.props.w, card.x + card.props.w + FRAME_PAD);
  const h = Math.max(parent.props.h, card.y + card.props.h + FRAME_PAD);
  if (w === parent.props.w && h === parent.props.h) return;
  serverWrite(editor, () => {
    if (isCollectionShape(parent)) {
      editor.updateShape<CollectionShape>({
        id: parent.id,
        type: COLLECTION_TYPE,
        props: { w, h, expandedH: h },
      });
    } else {
      editor.updateShape({ id: parent.id, type: 'frame', props: { w, h } });
    }
  });
}

// Wraps the selected top-level cards in a new frame and returns its id
const EMPTY_FRAME = { w: 400, h: 260 };

// Wraps the selected loose cards, or makes an empty collection mid-view
export function frameSelectedCards(editor: Editor) {
  const pageId = editor.getCurrentPageId();
  const cards = editor
    .getSelectedShapes()
    .filter((s) => s.type === CARD_TYPE && s.parentId === pageId);
  const center = editor.getViewportPageBounds().center;
  const bounds = cards.length
    ? editor.getShapesPageBounds(cards.map((c) => c.id))!
    : new Box(
        center.x - EMPTY_FRAME.w / 2,
        center.y - EMPTY_FRAME.h / 2,
        EMPTY_FRAME.w,
        EMPTY_FRAME.h,
      );
  const frameId = createShapeId();
  editor.markHistoryStoppingPoint('new collection');
  editor.createShape<TLFrameShape>({
    id: frameId,
    type: 'frame',
    x: bounds.x - FRAME_PAD,
    y: bounds.y - FRAME_PAD,
    props: {
      w: bounds.w + FRAME_PAD * 2,
      h: bounds.h + FRAME_PAD * 2,
      name: '',
    },
  });
  editor.reparentShapes(
    cards.map((c) => c.id),
    frameId,
  );
  editor.select(frameId);
  return frameId;
}

// New collections don't know their record key yet, so it is looked up on first use
export async function resolveCollectionRkey(editor: Editor, id: TLShapeId) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape)) throw new Error('Not a collection');
  if (shape.props.rkey) return shape.props.rkey;
  const page = await getCollectionPageById(shape.props.collectionId, {
    limit: 1,
  });
  const rkey = page.uri ? getRecordKey(page.uri) : '';
  if (!rkey) throw new Error('Collection has no record key');
  serverWrite(editor, () => {
    if (!editor.getShape(id)) return;
    editor.updateShape<CollectionShape>({
      id,
      type: COLLECTION_TYPE,
      props: { rkey },
    });
  });
  return rkey;
}

export async function resolveNodeUrl(editor: Editor, shape: NodeShape) {
  const url = getNodeUrl(shape);
  if (url || shape.type !== COLLECTION_TYPE) return url ?? '';
  const rkey = await resolveCollectionRkey(editor, shape.id);
  return collectionUrl(shape.props.authorHandle, rkey);
}

export async function openCollectionPage(editor: Editor, id: TLShapeId) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape)) return;
  if (shape.props.rkey) {
    window.open(
      collectionPath(shape.props.authorHandle, shape.props.rkey),
      '_blank',
    );
    return;
  }
  const tab = window.open('', '_blank');
  try {
    const rkey = await resolveCollectionRkey(editor, id);
    if (tab) tab.location.href = collectionPath(shape.props.authorHandle, rkey);
  } catch {
    tab?.close();
  }
}

// Cards taken out of a collection here that the server still lists, e.g. ones other
// people added; library sync leaves them out instead of putting them back
export const getHiddenUrls = (shape: CollectionShape): string[] =>
  (shape.meta.hiddenUrls as string[] | undefined) ?? [];

export function setUrlHidden(
  editor: Editor,
  id: TLShapeId,
  url: string,
  hidden: boolean,
) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape)) return;
  const urls = getHiddenUrls(shape);
  if (urls.includes(url) === hidden) return;
  serverWrite(editor, () =>
    editor.updateShape<CollectionShape>({
      id,
      type: COLLECTION_TYPE,
      meta: {
        ...shape.meta,
        hiddenUrls: hidden ? [...urls, url] : urls.filter((u) => u !== url),
      },
    }),
  );
}
