import { useEffect } from 'react';
import { Editor, uniqueId } from 'tldraw';
import { CARD_TYPE } from '../const';
import { isCardShape } from '../lib/arrows';
import { changedSharedProps, getCardCopies } from '../lib/nodes';
import { getStackMembers } from '../lib/stacks';

// Copies of a card are one card: an edit to any of them reaches the rest
export function useCardCopySync(editor: Editor) {
  useEffect(() => {
    // Duplicating a pile makes a new pile rather than growing the old one
    let pileIds: Map<string, string> | null = null;

    const disposers = [
      editor.sideEffects.registerBeforeCreateHandler(
        'shape',
        (shape, source) => {
          if (source !== 'user' || !isCardShape(shape) || !shape.props.stackId)
            return shape;
          const old = shape.props.stackId;
          if (!pileIds) {
            pileIds = new Map();
            queueMicrotask(() => (pileIds = null));
          }
          let stackId = pileIds.get(old);
          if (!stackId) {
            if (!getStackMembers(editor, old).length) return shape;
            stackId = uniqueId();
            pileIds.set(old, stackId);
          }
          return { ...shape, props: { ...shape.props, stackId } };
        },
      ),
      editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
        if (!isCardShape(prev) || !isCardShape(next) || next.props.ghost) {
          return;
        }
        const changed = changedSharedProps(prev, next);
        if (!changed) return;
        const siblings = getCardCopies(editor, next.props.url).filter(
          (s) =>
            s.id !== next.id &&
            Object.entries(changed).some(
              ([k, v]) => s.props[k as keyof typeof changed] !== v,
            ),
        );
        if (!siblings.length) return;
        editor.updateShapes(
          siblings.map((s) => ({ id: s.id, type: CARD_TYPE, props: changed })),
        );
      }),
    ];
    return () => disposers.forEach((dispose) => dispose());
  }, [editor]);
}
