import type { ConnectionType } from '@semble/types';
import { atom, computed, type Editor, type TLShapeId } from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import type { CanvasServer, ConnectionChange } from '../server/canvasServer';
import {
  connectionOf,
  isConnectionArrow,
} from '../shapes/connectionArrow/connectionArrows';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
import type { UndoToast } from './connections';

export interface ConnectionEditsDeps {
  editor: Editor;
  server: CanvasServer;
  undoToast: UndoToast;
  onConnectionUpdated(connectionId: string): void;
  // Takes its arrows off the board too
  onConnectionDeleted(connectionId: string): void;
  onServerError(message: string): void;
}

// The edit popup's type menu, which keeps the popup open
export const CONNECTION_TYPE_MENU = 'canvas-connection-type-menu';

// One of the viewer's own connections, as its arrow shows it
export interface EditableConnection {
  arrowId: TLShapeId;
  connectionId: string;
  type: ConnectionType | null;
  // The links of the copies the arrow joins
  sourceUrl: string;
  targetUrl: string;
}

// What the delete confirmation is for
export interface PendingDelete {
  connections: EditableConnection[];
  // Shapes selected with them, deleted as usual once confirmed
  others: TLShapeId[];
}

// Changes and flips are reversed through the same update call, which only
// reconciles mentions, so undoing one notifies nobody. Deleting is final:
// undoing it would publish a new connection and notify everyone again.
export function attachConnectionEdits(deps: ConnectionEditsDeps) {
  const { editor } = deps;
  const deleting = atom<PendingDelete | null>('deleting', null);
  // One edit at a time, since each is read from an arrow the server's
  // answer redraws
  let editing = false;

  const urlOf = (id: TLShapeId) => {
    const shape = editor.getShape(id);
    return shape && editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE)
      ? shape.props.url
      : null;
  };

  function editableOf(id: TLShapeId): EditableConnection | null {
    const shape = editor.getShape(id);
    const connection = shape && connectionOf(shape);
    if (!connection?.own) return null;
    const sourceUrl = urlOf(connection.from);
    const targetUrl = urlOf(connection.to);
    if (!sourceUrl || !targetUrl) return null;
    return {
      arrowId: id,
      connectionId: connection.connectionId,
      type: connection.connectionType,
      sourceUrl,
      targetUrl,
    };
  }

  // The connection the edit controls are for: one of the viewer's own,
  // selected on its own. Ghosts get none.
  const selected = computed<EditableConnection | null>(
    'editable connection',
    () => {
      if (!editor.isInAny('select.idle', 'select.pointing_shape')) return null;
      // Open menus are listed with the editor's context appended to their ids,
      // which tldraw's own isMenuOpen doesn't allow for
      const otherMenus = editor.menus
        .getOpenMenus()
        .filter((id) => !id.startsWith(CONNECTION_TYPE_MENU));
      if (otherMenus.length > 0 || editor.getIsReadonly()) return null;
      const shape = editor.getOnlySelectedShape();
      return shape ? editableOf(shape.id) : null;
    },
  );

  async function update(
    connectionId: string,
    change: ConnectionChange,
    failed: string,
  ) {
    if (editing || editor.getIsReadonly()) return false;
    editing = true;
    try {
      await deps.server.updateConnection(connectionId, change);
    } catch (error) {
      console.warn(error);
      deps.onServerError(failed);
      return false;
    } finally {
      editing = false;
    }
    deps.onConnectionUpdated(connectionId);
    return true;
  }

  // The toast's Undo, through the same update call
  const undoWith = (connectionId: string, change: ConnectionChange) =>
    async function undo() {
      await deps.server.updateConnection(connectionId, change);
      deps.onConnectionUpdated(connectionId);
    };

  async function changeType(
    connection: EditableConnection,
    type: ConnectionType,
  ) {
    const { connectionId, type: before } = connection;
    if (type === before) return;
    const failed = "Couldn't change the connection.";
    if (!(await update(connectionId, { type }, failed))) return;
    // A connection with no type can't be given none again
    if (!before) return deps.undoToast.forget(connectionId);
    deps.undoToast.offer({
      kind: 'retyped',
      connectionId,
      sourceUrl: connection.sourceUrl,
      targetUrl: connection.targetUrl,
      type,
      undo: undoWith(connectionId, { type: before }),
      undoFailed: failed,
    });
  }

  async function flip(connection: EditableConnection) {
    const { connectionId } = connection;
    const failed = "Couldn't flip the connection.";
    if (!(await update(connectionId, { swap: true }, failed))) return;
    deps.undoToast.offer({
      kind: 'flipped',
      connectionId,
      sourceUrl: connection.targetUrl,
      targetUrl: connection.sourceUrl,
      type: connection.type,
      undo: undoWith(connectionId, { swap: true }),
      undoFailed: failed,
    });
  }

  // Stands in for tldraw's delete when the selection holds connection arrows.
  // The viewer's own connections, and the other shapes selected with them,
  // wait for the confirmation; ghosts stay. Whether it handled the delete.
  function requestDelete() {
    if (editor.getIsReadonly() || !editor.isIn('select')) return false;
    const selected = editor.getSelectedShapes();
    const arrows = selected.filter(isConnectionArrow);
    if (arrows.length === 0) return false;
    const byConnection = new Map<string, EditableConnection>();
    for (const arrow of arrows) {
      const editable = editableOf(arrow.id);
      if (editable) byConnection.set(editable.connectionId, editable);
    }
    const others = selected
      .filter((shape) => !isConnectionArrow(shape))
      .map((shape) => shape.id);
    if (byConnection.size > 0) {
      deleting.set({ connections: Array.from(byConnection.values()), others });
    } else if (others.length > 0) {
      editor.markHistoryStoppingPoint('delete');
      editor.deleteShapes(others);
    }
    return true;
  }

  async function deleteOne({ connectionId }: EditableConnection) {
    // Nothing is left to undo, even while the delete is under way
    deps.undoToast.forget(connectionId);
    try {
      await deps.server.deleteConnection(connectionId);
    } catch (error) {
      console.warn(error);
      deps.onServerError("Couldn't delete the connection.");
      return;
    }
    deps.onConnectionDeleted(connectionId);
  }

  async function confirmDelete() {
    const pending = deleting.get();
    if (!pending) return;
    deleting.set(null);
    // The tab lost the board to another while the confirmation showed
    if (editor.getIsReadonly()) return;
    if (pending.others.length > 0) {
      editor.markHistoryStoppingPoint('delete');
      editor.deleteShapes(pending.others);
    }
    await Promise.all(pending.connections.map(deleteOne));
  }

  return {
    selected,
    changeType,
    flip,
    deleting,
    requestDelete,
    confirmDelete,
    cancelDelete: () => deleting.set(null),
  };
}

export type ConnectionEdits = ReturnType<typeof attachConnectionEdits>;
