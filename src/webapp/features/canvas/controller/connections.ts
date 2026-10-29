import type { ConnectionType } from '@semble/types';
import {
  atom,
  getArrowBindings,
  type Editor,
  type TLArrowShape,
  type TLShapeId,
} from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import { LINK_CARD_TYPE, linkKey } from '../model/linkCards';
import type { CanvasServer, NewConnection } from '../server/canvasServer';
import { isConnectionArrow } from '../shapes/connectionArrow/connectionArrows';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';

export interface ConnectionsDeps {
  editor: Editor;
  server: CanvasServer;
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

export interface UndoableWrite extends NewConnection {
  undo(): Promise<void>;
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
  // Taken when an arrow drag starts
  let drawing: { markId: string; before: Set<TLShapeId> } | null = null;
  let pickerMarkId = '';

  const linkUrlOf = (id: TLShapeId | undefined) => {
    const shape = id && editor.getShape(id);
    if (!shape || !editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE))
      return null;
    return linkKey(shape.props.url) ?? shape.props.url;
  };

  function close() {
    if (!state.get()) return;
    state.set(null);
    editor.bailToMark(pickerMarkId);
  }

  // Arrows touching anything but two links stay on the board only
  function arrowDrawn(markId: string, arrow: TLArrowShape) {
    const bindings = getArrowBindings(editor, arrow);
    const sourceUrl = linkUrlOf(bindings.start?.toId);
    const targetUrl = linkUrlOf(bindings.end?.toId);
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

  async function publish(type?: ConnectionType) {
    const open = state.get();
    if (!open) return;
    close();
    const connection = {
      sourceUrl: open.sourceUrl,
      targetUrl: open.targetUrl,
      type: type ?? open.highlighted,
    };
    let connectionId: string;
    try {
      connectionId = await deps.server.createConnection(connection);
    } catch (error) {
      console.warn(error);
      deps.onServerError("Couldn't publish the connection.");
      return;
    }
    deps.onConnectionCreated(connection);
    // Deleting it needs no confirmation: nobody has seen it yet. There's no
    // redo, which would notify everyone a second time.
    undoable.set({
      ...connection,
      async undo() {
        await deps.server.deleteConnection(connectionId);
        deps.onConnectionDeleted(connectionId);
      },
    });
  }

  const picker = {
    state,
    publish,
    discard: close,
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
    // Whether there was a write to undo
    undo() {
      const write = undoable.get();
      if (!write) return false;
      undoable.set(null);
      write.undo().catch((error) => {
        console.warn(error);
        deps.onServerError("Couldn't delete the connection.");
        // Offered again, unless another write has taken its place
        if (!undoable.get()) undoable.set(write);
      });
      return true;
    },
    dismiss: () => undoable.set(null),
  };

  return {
    picker,
    undoToast,
    detach() {
      editor.off('before-event', onBeforeEvent);
      editor.off('event', onEvent);
      // Before the board's last save, which would keep the drawn arrow
      close();
      undoable.set(null);
    },
  };
}

export type ConnectionPicker = ReturnType<typeof attachConnections>['picker'];
export type UndoToast = ReturnType<typeof attachConnections>['undoToast'];
