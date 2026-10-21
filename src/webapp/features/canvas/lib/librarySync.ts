import { Editor, TLShapeId } from 'tldraw';
import type {
  GetCollectionPageResponse,
  GetUrlStatusForMyLibraryResponse,
} from '@semble/types';
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
import {
  cardPropsFromUrlCard,
  collectionProps,
  fitContainerToCard,
  getHiddenUrls,
  isCollectionShape,
} from './frames';
import { getCardCopies, newCardId, sharedCardProps } from './nodes';

const differs = <T extends object>(props: T, next: Partial<T>) =>
  (Object.keys(next) as (keyof T)[]).some((k) => props[k] !== next[k]);

// Brings every copy of a card in line with the user's library: saved or not, and its note
export function applyLibraryStatus(
  editor: Editor,
  url: string,
  status: GetUrlStatusForMyLibraryResponse,
) {
  const card = status.card;
  const content = card?.cardContent;
  const next: Partial<CardShape['props']> = card
    ? {
        cardId: card.id,
        note: card.note?.text ?? '',
        ...(content?.title && { title: content.title }),
        ...(content?.description && { description: content.description }),
        ...(content?.imageUrl && { imageUrl: content.imageUrl }),
        ...(content?.siteName && { siteName: content.siteName }),
      }
    : { cardId: '', note: '' };

  const stale = getCardCopies(editor, url).filter(
    (c) => c.props.status !== 'loading' && differs(c.props, next),
  );
  if (!stale.length) return;
  serverWrite(editor, () =>
    editor.updateShapes(
      stale.map((c) => ({ id: c.id, type: CARD_TYPE, props: next })),
    ),
  );
}

// Matches a collection on the canvas to the server: its details and which cards it holds.
// Cards are only added or taken out when the whole collection came back in one page.
export function applyCollectionPage(
  editor: Editor,
  id: TLShapeId,
  page: GetCollectionPageResponse,
  userId: string,
  isTouched: (key: string) => boolean,
) {
  const shape = editor.getShape(id);
  if (!isCollectionShape(shape)) return;

  serverWrite(editor, () => {
    if (!isTouched(page.id)) {
      const { rkey, ...details } = collectionProps(page, userId);
      const next = { ...details, ...(rkey && { rkey }) };
      if (differs(shape.props, next)) {
        editor.updateShape<CollectionShape>({
          id,
          type: COLLECTION_TYPE,
          props: next,
        });
      }
    }
    if (page.pagination.hasMore) return;

    const inside = editor
      .getSortedChildIdsForParent(id)
      .map((childId) => editor.getShape(childId))
      .filter((s): s is CardShape => isCardShape(s) && !s.props.ghost);
    const onServer = new Set(page.urlCards.map((c) => c.url));
    const here = new Set([
      ...inside.map((c) => c.props.url),
      ...getHiddenUrls(shape),
    ]);

    takeOut(
      editor,
      shape,
      inside.filter(
        (c) =>
          !onServer.has(c.props.url) &&
          c.props.status !== 'loading' &&
          !isTouched(c.props.url),
      ),
    );
    addInto(
      editor,
      shape,
      inside,
      page.urlCards.filter((c) => !here.has(c.url) && !isTouched(c.url)),
      userId,
    );
  });
}

// A copy that has others elsewhere goes; the only copy of a card moves out beside the collection
function takeOut(editor: Editor, shape: CollectionShape, cards: CardShape[]) {
  const bounds = editor.getShapePageBounds(shape);
  if (!cards.length || !bounds) return;
  let y = bounds.y;
  for (const card of cards) {
    if (getCardCopies(editor, card.props.url).length > 1) {
      editor.deleteShape(card.id);
      continue;
    }
    editor.reparentShapes([card.id], editor.getCurrentPageId());
    editor.updateShape({
      id: card.id,
      type: CARD_TYPE,
      x: bounds.maxX + CARD_GAP * 2,
      y,
    });
    y += card.props.h + CARD_GAP;
  }
}

// New cards go in a row under what the collection already shows
function addInto(
  editor: Editor,
  shape: CollectionShape,
  inside: CardShape[],
  cards: GetCollectionPageResponse['urlCards'],
  userId: string,
) {
  if (!cards.length) return;
  const top = inside.length
    ? Math.max(...inside.map((c) => c.y + c.props.h)) + CARD_GAP
    : COLLECTION_HEADER_H + FRAME_PAD;

  cards.forEach((card, i) => {
    const sibling = getCardCopies(editor, card.url)[0];
    const id = newCardId(editor, card.url);
    editor.createShape<CardShape>({
      id,
      type: CARD_TYPE,
      parentId: shape.id,
      x: FRAME_PAD + (i % FRAME_MAX_COLS) * (CARD_W + CARD_GAP),
      y: top + Math.floor(i / FRAME_MAX_COLS) * (CARD_H + CARD_GAP),
      props: sibling
        ? { ...sharedCardProps(sibling), url: card.url }
        : cardPropsFromUrlCard(card, userId),
    });
    const created = editor.getShape<CardShape>(id);
    if (created) fitContainerToCard(editor, created);
  });
}
