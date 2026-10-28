import {
  createSessionStateSnapshotSignal,
  loadSnapshot,
  type Editor,
  type TLSessionStateSnapshot,
  type TLStoreSnapshot,
} from 'tldraw';
import type { CanvasServer } from '../server/canvasServer';
import type { CanvasSaver, CanvasStorage } from '../storage/canvasStorage';

export interface CanvasControllerDeps {
  editor: Editor;
  server: CanvasServer;
  storage: CanvasStorage;
  canvasId: string;
  ownerDid: string;
  onStorageError(error: unknown): void;
}

// tldraw doesn't export its version; a test keeps this in step with the pin
export const TLDRAW_VERSION = '3.15.6';

export type CanvasLoadStatus = 'ready' | 'newer-version';

export function attachCanvasController(deps: CanvasControllerDeps) {
  const { editor, storage, canvasId } = deps;
  let detached = false;
  let saver: CanvasSaver | null = null;
  let unlisten: (() => void) | null = null;

  async function load(): Promise<CanvasLoadStatus> {
    const opened = await storage.openCanvas(
      canvasId,
      editor.store.schema.serialize(),
    );
    // Saving would overwrite what the newer app wrote
    if (opened.status === 'newer-version') return opened.status;
    if (detached) return 'ready';

    if (opened.status === 'missing') {
      await storage.createCanvas(deps.ownerDid, canvasId);
      if (detached) return 'ready';
    } else if (opened.document || opened.session) {
      loadSnapshot(editor.store, {
        document: (opened.document ?? undefined) as TLStoreSnapshot | undefined,
        session: opened.session?.editor as TLSessionStateSnapshot | undefined,
      });
      editor.clearHistory();
    }

    const session = createSessionStateSnapshotSignal(editor.store);
    saver = storage.startSaving(
      canvasId,
      {
        getDocument: () => ({
          schema: editor.store.schema.serialize(),
          store: editor.store.serialize('document'),
        }),
        getSession: () => ({ editor: session.get() ?? {} }),
        // Listeners hear about changes on the next frame, which never comes
        // in a hidden tab
        reportPendingChanges: () => editor.store._flushHistory(),
      },
      deps.onStorageError,
    );
    // Remote changes are saved too, not only the user's
    unlisten = editor.store.listen(() => saver?.documentChanged(), {
      scope: 'document',
      source: 'all',
    });
    return 'ready';
  }

  return {
    loaded: load(),
    async detach() {
      detached = true;
      // Stop before unlistening: its flush reports pending changes through
      // the listener
      const stopped = saver?.stop();
      unlisten?.();
      await stopped;
    },
  };
}
