import { useEffect } from 'react';
import {
  atom,
  Editor,
  react,
  TLArrowShape,
  TLShape,
  TLShapeId,
  useValue,
} from 'tldraw';
import {
  arrowStyle,
  getArrowEnds,
  getArrowMeta,
  restoreConnectionArrow,
  serverWrite,
} from '../lib/arrows';
import type { CanvasSession } from '../lib/canvasSession';
import type { ArrowMeta, CanvasConnection } from '../types';

const isServerArrow = (shape: TLShape | undefined): shape is TLArrowShape => {
  const status = shape?.type === 'arrow' ? getArrowMeta(shape).status : null;
  return status === 'saved' || status === 'ghost';
};

export function useArrowConnectionSync(editor: Editor, session: CanvasSession) {
  // A user-drawn arrow joining two cards or collections becomes a pending connection
  const candidateId = useValue(
    'unclassified card arrow',
    () => {
      if (!editor.isIn('select.idle') || session.pendingArrowId.get()) {
        return null;
      }
      for (const shape of editor.getCurrentPageShapes()) {
        if (shape.type !== 'arrow' || getArrowMeta(shape).status) continue;
        if (getArrowEnds(editor, shape.id)) return shape.id;
      }
      return null;
    },
    [editor, session],
  );

  useEffect(() => {
    if (!candidateId) return;
    editor.run(
      () =>
        editor.updateShape<TLArrowShape>({
          id: candidateId,
          type: 'arrow',
          meta: { status: 'pending' },
          props: arrowStyle(undefined, 'pending'),
        }),
      { history: 'ignore' },
    );
    session.pendingArrowId.set(candidateId);
  }, [candidateId, editor, session]);

  // Server-backed arrows are derived state: edits snap back, deletes need confirming
  useEffect(() => {
    const dirty = new Map<TLShapeId, TLArrowShape | null>();
    const dirtyVersion = atom('dirty server arrows', 0);
    const markDirty = (id: TLShapeId, deleted: TLArrowShape | null = null) => {
      dirty.set(id, deleted ?? dirty.get(id) ?? null);
      dirtyVersion.update((v) => v + 1);
    };

    const flush = (entries: [TLShapeId, TLArrowShape | null][]) => {
      const toConfirm: CanvasConnection[] = [];
      const restore: [
        TLShapeId,
        CanvasConnection,
        'saved' | 'ghost',
        ArrowMeta,
      ][] = [];
      const remove: TLShapeId[] = [];

      for (const [id, deleted] of entries) {
        const record = deleted ?? editor.getShape<TLArrowShape>(id);
        if (!record) continue;
        const meta = getArrowMeta(record);
        const connection = meta.connectionId && session.get(meta.connectionId);
        if (!connection) continue;
        const status = meta.status === 'ghost' ? 'ghost' : 'saved';

        // The copies this arrow was drawn between
        const endsPresent =
          !!meta.sourceId &&
          !!meta.targetId &&
          !!editor.getShape(meta.sourceId) &&
          !!editor.getShape(meta.targetId);

        if (deleted) {
          if (!endsPresent || editor.getShape(id)) continue;
          if (status === 'ghost') restore.push([id, connection, status, meta]);
          else toConfirm.push(connection);
        } else if (endsPresent) {
          restore.push([id, connection, status, meta]);
        } else {
          remove.push(id);
        }
      }

      if (restore.length || remove.length) {
        serverWrite(editor, () => {
          restore.forEach(([id, c, s, meta]) => {
            if (!restoreConnectionArrow(editor, c, s, meta)) remove.push(id);
          });
          if (remove.length) editor.deleteShapes(remove);
        });
      }
      if (toConfirm.length) {
        // Deleting several copies' arrows asks about their connection once
        session.pendingDeletes.update((prev) => {
          const queued = new Map(prev.map((c) => [c.id, c]));
          toConfirm.forEach((c) => queued.set(c.id, c));
          return Array.from(queued.values());
        });
      }
    };

    const disposers = [
      editor.sideEffects.registerAfterChangeHandler(
        'binding',
        (_, next, source) => {
          if (source !== 'user' || next.type !== 'arrow') return;
          if (isServerArrow(editor.getShape(next.fromId)))
            markDirty(next.fromId);
        },
      ),
      editor.sideEffects.registerAfterDeleteHandler(
        'binding',
        (binding, source) => {
          if (source !== 'user' || binding.type !== 'arrow') return;
          if (isServerArrow(editor.getShape(binding.fromId))) {
            markDirty(binding.fromId);
          }
        },
      ),
      editor.sideEffects.registerAfterDeleteHandler(
        'shape',
        (shape, source) => {
          if (source === 'user' && isServerArrow(shape))
            markDirty(shape.id, shape);
        },
      ),
      react('flush server arrows', () => {
        dirtyVersion.get();
        if (!editor.isIn('select.idle') || !dirty.size) return;
        const entries = Array.from(dirty);
        dirty.clear();
        queueMicrotask(() => flush(entries));
      }),
    ];

    return () => disposers.forEach((dispose) => dispose());
  }, [editor, session]);
}
