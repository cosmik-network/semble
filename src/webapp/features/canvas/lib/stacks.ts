import { computed, Computed, Editor, TLShapeId, uniqueId } from 'tldraw';
import { CARD_GAP, CARD_TYPE, STACK_OFFSET } from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import { isCardShape } from './arrows';
import { arrangeCollection, isCollectionShape } from './frames';

export interface StackSlot {
  stackId: string;
  index: number;
  count: number;
}

const slotsByEditor = new WeakMap<
  Editor,
  Computed<Map<TLShapeId, StackSlot>>
>();

// Each stacked card's place in its pile, bottom first; shared so cards don't each scan the page
export function getStackSlots(editor: Editor) {
  let slots = slotsByEditor.get(editor);
  if (!slots) {
    slots = computed('stack slots', () => {
      const piles = new Map<string, CardShape[]>();
      for (const shape of editor.getCurrentPageShapesSorted()) {
        if (!isCardShape(shape) || !shape.props.stackId) continue;
        const pile = piles.get(shape.props.stackId);
        if (pile) pile.push(shape);
        else piles.set(shape.props.stackId, [shape]);
      }
      const result = new Map<TLShapeId, StackSlot>();
      piles.forEach((pile, stackId) => {
        // A pile of one is just a card
        if (pile.length < 2) return;
        pile.forEach((card, index) =>
          result.set(card.id, { stackId, index, count: pile.length }),
        );
      });
      return result;
    });
    slotsByEditor.set(editor, slots);
  }
  return slots.get();
}

export function getStackMembers(editor: Editor, stackId: string) {
  return editor
    .getCurrentPageShapesSorted()
    .filter(
      (s): s is CardShape => isCardShape(s) && s.props.stackId === stackId,
    );
}

// Cards that can be piled together: real cards sharing the first one's parent
export function getStackableCards(editor: Editor) {
  const cards = editor
    .getSelectedShapes()
    .filter((s): s is CardShape => isCardShape(s) && !s.props.ghost);
  const parentId = cards[0]?.parentId;
  const sameParent = cards.filter((c) => c.parentId === parentId);
  return sameParent.length > 1 ? sameParent : [];
}

// The stack id when the selection is exactly one whole pile
export function getSelectedStackId(editor: Editor) {
  const selected = editor.getSelectedShapes();
  const first = selected[0];
  if (!isCardShape(first) || !first.props.stackId) return null;
  const stackId = first.props.stackId;
  const members = getStackMembers(editor, stackId);
  return members.length > 1 &&
    selected.length === members.length &&
    selected.every((s) => isCardShape(s) && s.props.stackId === stackId)
    ? stackId
    : null;
}

export function stackCards(editor: Editor, cards: CardShape[]) {
  if (cards.length < 2) return;
  const stackId = uniqueId();
  const x = Math.min(...cards.map((c) => c.x));
  const y = Math.min(...cards.map((c) => c.y));

  editor.markHistoryStoppingPoint('stack cards');
  editor.run(() => {
    cards.forEach((card, i) => {
      editor.updateShape<CardShape>({
        id: card.id,
        type: CARD_TYPE,
        x: x + i * STACK_OFFSET,
        y: y + i * STACK_OFFSET,
        props: { stackId },
      });
      editor.bringToFront([card.id]);
    });
  });
  editor.select(...cards.map((c) => c.id));
}

// Spreads a pile back out in a row from where it sat
export function unstack(editor: Editor, stackId: string) {
  const cards = getStackMembers(editor, stackId);
  if (!cards.length) return;
  const parent = editor.getShape(cards[0].parentId as TLShapeId);
  const x0 = Math.min(...cards.map((c) => c.x));
  const y0 = Math.min(...cards.map((c) => c.y));

  editor.markHistoryStoppingPoint('unstack cards');
  editor.run(() => {
    let x = x0;
    cards.forEach((card) => {
      editor.updateShape<CardShape>({
        id: card.id,
        type: CARD_TYPE,
        x,
        y: y0,
        props: { stackId: '' },
      });
      x += card.props.w + CARD_GAP;
    });
  });
  if (isCollectionShape(parent)) arrangeCollection(editor, parent.id);
  editor.select(...cards.map((c) => c.id));
}

// Layouts move cards one by one, which breaks any piles among them
export function clearStacks(editor: Editor, ids: TLShapeId[]) {
  const stacked = ids
    .map((id) => editor.getShape(id))
    .filter((s): s is CardShape => isCardShape(s) && !!s.props.stackId);
  if (!stacked.length) return;
  editor.updateShapes(
    stacked.map((s) => ({
      id: s.id,
      type: CARD_TYPE,
      props: { stackId: '' },
    })),
  );
}
