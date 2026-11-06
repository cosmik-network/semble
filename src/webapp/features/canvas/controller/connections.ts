import type { ConnectionType } from '@semble/types';
import {
  atom,
  getArrowBindings,
  transact,
  type Editor,
  type TLArrowShape,
  type TLShapeId,
} from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import { collectionFrameOf } from '../model/collectionFrames';
import type { CanvasServer, NewConnection } from '../server/canvasServer';
import { isConnectionArrow } from '../shapes/connectionArrow/connectionArrows';
import type { ConnectionEnds } from './connectionEnds';

export interface ConnectionsDeps {
  editor: Editor;
  server: CanvasServer;
  ends: ConnectionEnds;
  // As a connection starts publishing. Settled with its id, or null if it
  // wasn't published.
  onPublishing(
    connection: NewConnection,
  ): (connectionId: string | null) => void;
  // After a connection is made or deleted, with the links it joins
  onConnectionCreated(connection: {
    sourceUrl: string;
    targetUrl: string;
  }): void;
  onConnectionDeleted(connectionId: string): void;
  onServerError(message: string): void;
}

export interface PickerState {
  // The arrow drawn, which stays on the board until the picker closes
  arrowId: TLShapeId;
  sourceUrl: string;
  targetUrl: string;
  highlighted: ConnectionType;
}

// A server write the toast can reverse
export interface UndoableWrite {
  kind: 'published' | 'retyped' | 'flipped' | 'noted';
  connectionId: string;
  sourceUrl: string;
  targetUrl: string;
  // The type it has after the write
  type: ConnectionType | null;
  undo(): Promise<void>;
  // Shown if the undo fails
  undoFailed: string;
}

const TYPES = CONNECTION_TYPES.map((type) => type.value);
const FIRST_TYPE: ConnectionType = 'RELATED';

// An arrow drawn from one link to another opens the type picker, and picking
// a type publishes the connection. The drawn arrow is rolled back either way,
// so publishing and backing out leave nothing in undo; the server's
// connection comes back as a derived arrow.
export function attachConnections(deps: ConnectionsDeps) {
  const { editor } = deps;
  const state = atom<PickerState | null>('connection picker', null);
  const undoable = atom<UndoableWrite | null>('undoable write', null);
  const publishing = atom<NewConnection | null>('publishing', null);
  // Taken when an arrow drag starts
  let drawing: { markId: string; before: Set<TLShapeId> } | null = null;
  let pickerMarkId = '';

  // Arrows bind to collection frames, which are connection ends, but not to
  // frames the user drew. tldraw 3.15.6 gives ShapeUtil.canBind only the
  // shapes' types, both frame here, so the editor's check is wrapped instead.
  const canBindShapes = editor.canBindShapes;
  editor.canBindShapes = (opts) => {
    const { toShape } = opts;
    const isDrawnFrame =
      typeof toShape === 'object' &&
      'meta' in toShape &&
      toShape.type === 'frame' &&
      !collectionFrameOf(toShape);
    return !isDrawnFrame && canBindShapes.call(editor, opts);
  };

  function close() {
    if (!state.get()) return;
    state.set(null);
    editor.bailToMark(pickerMarkId);
  }

  // Arrows touching anything but links and collection frames stay on the
  // board only
  function arrowDrawn(markId: string, arrow: TLArrowShape) {
    const bindings = getArrowBindings(editor, arrow);
    const sourceUrl = deps.ends.urlOf(bindings.start?.toId);
    const targetUrl = deps.ends.urlOf(bindings.end?.toId);
    if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) return;
    pickerMarkId = markId;
    state.set({
      arrowId: arrow.id,
      sourceUrl,
      targetUrl,
      highlighted: FIRST_TYPE,
    });
  }

  function onBeforeEvent(info: { type: string; name: string }) {
    if (info.type !== 'pointer' || info.name !== 'pointer_down') return;
    // Clicking the board while the picker shows backs out of it
    close();
    if (!editor.isIn('arrow') || editor.getIsReadonly()) return;
    drawing = {
      markId: editor.markHistoryStoppingPoint('draw connection'),
      before: new Set(editor.getCurrentPageShapeIds()),
    };
  }

  function onEvent(info: { type: string; name: string }) {
    if (info.type !== 'pointer' || info.name !== 'pointer_up' || !drawing)
      return;
    const { markId, before } = drawing;
    drawing = null;
    const shape = editor.getOnlySelectedShape();
    if (
      shape &&
      !before.has(shape.id) &&
      editor.isShapeOfType<TLArrowShape>(shape, 'arrow') &&
      !isConnectionArrow(shape)
    ) {
      arrowDrawn(markId, shape);
    }
  }

  editor.on('before-event', onBeforeEvent);
  editor.on('event', onEvent);

  async function publish(type?: ConnectionType, note?: string) {
    const open = state.get();
    if (!open) return;
    close();
    // Another tab took the board over while the picker showed
    if (editor.getIsReadonly()) return;
    const connection: NewConnection = {
      sourceUrl: open.sourceUrl,
      targetUrl: open.targetUrl,
      type: type ?? open.highlighted,
      ...(note?.trim() && { note: note.trim() }),
    };
    // Replaces the last write's toast, as the published one would
    transact(() => {
      undoable.set(null);
      publishing.set(connection);
    });
    const settle = deps.onPublishing(connection);
    let connectionId: string;
    try {
      connectionId = await deps.server.createConnection(connection);
    } catch (error) {
      console.warn(error);
      settle(null);
      if (publishing.get() === connection) publishing.set(null);
      deps.onServerError("Couldn't publish the connection.");
      return;
    }
    settle(connectionId);
    deps.onConnectionCreated(connection);
    // Deleting it needs no confirmation: nobody has seen it yet. There's no
    // redo, which would notify everyone a second time.
    // Another publish since keeps its toast
    transact(() => {
      if (publishing.get() === connection) publishing.set(null);
      undoable.set({
        ...connection,
        kind: 'published',
        connectionId,
        async undo() {
          await deps.server.deleteConnection(connectionId);
          deps.onConnectionDeleted(connectionId);
        },
        undoFailed: "Couldn't delete the connection.",
      });
    });
  }

  const picker = {
    state,
    publish,
    discard: close,
    highlight(type: ConnectionType) {
      const open = state.get();
      if (open && open.highlighted !== type) {
        state.set({ ...open, highlighted: type });
      }
    },
    moveHighlight(by: 1 | -1) {
      const open = state.get();
      if (!open) return;
      const index = TYPES.indexOf(open.highlighted);
      const next = TYPES[(index + by + TYPES.length) % TYPES.length];
      state.set({ ...open, highlighted: next });
    },
    swap() {
      const open = state.get();
      if (!open) return;
      state.set({
        ...open,
        sourceUrl: open.targetUrl,
        targetUrl: open.sourceUrl,
      });
    },
  };

  // Server writes stay out of tldraw's history. The toast's Undo, or Cmd+Z
  // while it shows, reverses the last one.
  const undoToast = {
    current: undoable,
    publishing,
    // Whether there was a write to undo
    undo() {
      const write = undoable.get();
      // A tab that lost the board writes nothing
      if (!write || editor.getIsReadonly()) return false;
      undoable.set(null);
      write.undo().catch((error) => {
        console.warn(error);
        deps.onServerError(write.undoFailed);
        // Offered again, unless another write has taken its place
        if (!undoable.get()) undoable.set(write);
      });
      return true;
    },
    dismiss: () => undoable.set(null),
    offer: (write: UndoableWrite) => undoable.set(write),
    // A deleted connection's last write has nothing left to undo
    forget(connectionId: string) {
      if (undoable.get()?.connectionId === connectionId) undoable.set(null);
    },
  };

  return {
    picker,
    undoToast,
    detach() {
      editor.canBindShapes = canBindShapes;
      editor.off('before-event', onBeforeEvent);
      editor.off('event', onEvent);
      // Before the board's last save, which would keep the drawn arrow
      close();
      undoable.set(null);
      publishing.set(null);
    },
  };
}

export type ConnectionPicker = ReturnType<typeof attachConnections>['picker'];
export type UndoToast = ReturnType<typeof attachConnections>['undoToast'];
