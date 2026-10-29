import { computed, type Editor, type TLShapeId } from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';

// Every copy of each link on the board. All copies are equal: none is the
// original.
export function attachCopies(editor: Editor) {
  const { store } = editor;
  // Changes only when cards are added or deleted, not when one moves
  const cardIds = store.query.ids('shape', () => ({
    type: { eq: LINK_CARD_TYPE },
  }));
  // A card's link never changes, so reading it untracked keeps moves from
  // rebuilding the index
  const byUrl = computed('copies', () => {
    const index = new Map<string, TLShapeId[]>();
    for (const id of Array.from(cardIds.get())) {
      const card = store.unsafeGetWithoutCapture(id) as LinkCardShape;
      index.set(card.props.url, [...(index.get(card.props.url) ?? []), id]);
    }
    return index;
  });
  const outlined = computed('outlined copies', () => {
    const hovered = editor.getHoveredShape();
    if (
      !hovered ||
      !editor.isShapeOfType<LinkCardShape>(hovered, LINK_CARD_TYPE)
    ) {
      return new Set<TLShapeId>();
    }
    const copies = byUrl.get().get(hovered.props.url) ?? [];
    return new Set(copies.filter((id) => id !== hovered.id));
  });

  return {
    count: (url: string) => byUrl.get().get(url)?.length ?? 0,
    isOutlined: (id: TLShapeId) => outlined.get().has(id),
  };
}

export type Copies = ReturnType<typeof attachCopies>;
