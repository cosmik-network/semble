import { useEffect } from 'react';
import { Box, Editor, react, TLEventInfo, TLShape } from 'tldraw';
import { COLLECTION_HEADER_H, STACK_FAN_STEP, STACK_OFFSET } from '../const';
import { isCardShape } from '../lib/arrows';
import type { CanvasSession } from '../lib/canvasSession';
import { isCollectionShape } from '../lib/frames';
import { getStackMembers, getStackSlots } from '../lib/stacks';

// Where a pile's cards sit while cascaded open
function fannedBounds(editor: Editor, stackId: string) {
  const rects = getStackMembers(editor, stackId).flatMap((card, i) => {
    const b = editor.getShapePageBounds(card);
    if (!b) return [];
    return [
      b.clone().translate({
        x: -i * STACK_OFFSET,
        y: i * (STACK_FAN_STEP - STACK_OFFSET),
      }),
    ];
  });
  return rects.length ? Box.Common(rects) : null;
}

const isOnHeader = (editor: Editor, shape: TLShape) => {
  const bounds = editor.getShapePageBounds(shape);
  const y = editor.inputs.getCurrentPagePoint().y;
  return !!bounds && y - bounds.minY <= COLLECTION_HEADER_H;
};

export function useCanvasInteractions(editor: Editor, session: CanvasSession) {
  useEffect(() => {
    const onEvent = (info: TLEventInfo) => {
      if (info.type !== 'click' || info.name !== 'double_click') return;
      if (info.phase !== 'up' || !editor.isIn('select')) return;
      if (info.target === 'canvas') {
        session.quickAdd.set({ point: editor.inputs.getCurrentPagePoint() });
      } else if (info.target === 'shape' && isCardShape(info.shape)) {
        session.panelShapeId.set(info.shape.id);
      } else if (
        info.target === 'shape' &&
        isCollectionShape(info.shape) &&
        isOnHeader(editor, info.shape)
      ) {
        session.renamingCollectionId.set(info.shape.id);
      }
    };
    editor.on('event', onEvent);

    // The similar strip closes once its card is no longer the only selection
    const stopSimilar = react('close similar strip', () => {
      const anchorId = session.similarAnchorId.get();
      if (anchorId && editor.getOnlySelectedShapeId() !== anchorId) {
        queueMicrotask(() => session.similarAnchorId.set(null));
      }
    });

    // Hovering a pile cascades it open; it stays open while the pointer is over the cascade
    const stopFan = react('fan stacks', () => {
      let next: string | null = null;
      if (editor.isIn('select.idle')) {
        const hoveredId = editor.getHoveredShapeId();
        const slot = hoveredId && getStackSlots(editor).get(hoveredId);
        const current = session.fannedStackId.__unsafe__getWithoutCapture();
        if (slot) next = slot.stackId;
        else if (current) {
          const bounds = fannedBounds(editor, current);
          const pointer = editor.inputs.getCurrentPagePoint();
          if (bounds?.containsPoint(pointer)) next = current;
        }
      }
      if (next !== session.fannedStackId.__unsafe__getWithoutCapture()) {
        queueMicrotask(() => session.fannedStackId.set(next));
      }
    });

    // A pile is picked up whole: selecting one card selects its pile
    const stopStackSelect = react('select whole stacks', () => {
      const selected = editor.getSelectedShapeIds();
      const slots = getStackSlots(editor);
      const stackIds = new Set(
        selected.flatMap((id) => {
          const slot = slots.get(id);
          return slot ? [slot.stackId] : [];
        }),
      );
      if (!stackIds.size) return;
      const ids = new Set(selected);
      stackIds.forEach((stackId) =>
        getStackMembers(editor, stackId).forEach((c) => ids.add(c.id)),
      );
      if (ids.size === selected.length) return;
      queueMicrotask(() => editor.setSelectedShapes(Array.from(ids)));
    });

    return () => {
      editor.off('event', onEvent);
      stopSimilar();
      stopFan();
      stopStackSelect();
    };
  }, [editor, session]);
}
