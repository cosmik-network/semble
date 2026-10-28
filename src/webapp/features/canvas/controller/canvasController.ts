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

export type CanvasLoadStatus = 'ready' | 'newer-version';

// Logical width of the thumbnail, drawn at twice that for sharp screens
const THUMBNAIL_WIDTH = 320;

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function captureThumbnail(editor: Editor) {
  const bounds = editor.getCurrentPageBounds();
  if (!bounds) return null;
  const { blob } = await editor.toImage(
    Array.from(editor.getCurrentPageShapeIds()),
    {
      format: 'jpeg',
      quality: 0.8,
      background: true,
      scale: Math.min(1, THUMBNAIL_WIDTH / bounds.w),
    },
  );
  return readAsDataUrl(blob);
}

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
        getThumbnail: () => captureThumbnail(editor),
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
