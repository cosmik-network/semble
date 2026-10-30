import {
  createSessionStateSnapshotSignal,
  loadSnapshot,
  type Editor,
  type TLRecord,
  type TLSessionStateSnapshot,
  type TLStoreSnapshot,
} from 'tldraw';
import {
  DEFAULT_CANVAS_NAME,
  type BoardStatus,
  type CanvasDocument,
} from '../storage/canvasStorage';
import { attachArrows } from './arrows';
import {
  COLLECTION_LOAD_FAILED,
  attachCollectionFrames,
} from './collectionFrames';
import {
  invalidateAfterConnectionCreated,
  invalidateAfterConnectionDeleted,
  invalidateAfterConnectionUpdated,
} from '@/features/connections/lib/connectionInvalidation';
import { attachConnectionEdits } from './connectionEdits';
import { attachConnections } from './connections';
import { attachCopies } from './copies';
import { attachLinkCards, type LinkCardsDeps } from './linkCards';
import { attachLinkSeed, type SeedProgress } from './linkSeed';
import { createMediaReveals } from './mediaReveals';
import { attachQuickAdd } from './quickAdd';
import { createPopupCard } from './popupCard';
import { attachRefreshLoop, type RefreshLoopDeps } from './refreshLoop';

export interface CanvasControllerDeps
  extends LinkCardsDeps, Pick<RefreshLoopDeps, 'everyTimedRefresh'> {
  ownerDid: string;
  // Opened from this link's Semble page: a new board starts from the link
  seedUrl?: string;
  // Opened from this collection's page: it joins the board, new or not
  seedCollectionId?: string;
  onStorageError(error: unknown): void;
  // Another tab took the board over. Edits since the last save are lost.
  onTakenOver(): void;
  // This tab writes the board again after another had taken it over
  onWritingAgain(): void;
  // A newer app has saved the board since it loaded, so this tab can't write it
  onNewerVersion(): void;
  // A connection couldn't be published or deleted
  onServerError(message: string): void;
  // While the board is loaded from a seed, what it's waiting on
  onSeedProgress(progress: SeedProgress | null): void;
}

export type CanvasLoadStatus = BoardStatus;

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

// Only records that differ are replaced, so the rest of the board doesn't
// redraw and a selection or pan in progress isn't interrupted
function applyRemoteSave(editor: Editor, document: CanvasDocument) {
  const { store } = editor;
  const migrated = store.schema.migrateStoreSnapshot(
    document as unknown as TLStoreSnapshot,
  );
  if (migrated.type === 'error') {
    throw new Error(`Couldn't migrate a saved canvas: ${migrated.reason}`);
  }
  const isDocument = (record: TLRecord) =>
    store.scopedTypes.document.has(record.typeName);
  const saved = Object.values(migrated.value).filter(isDocument);
  const savedIds = new Set(saved.map((record) => record.id));
  const removed = store
    .allRecords()
    .filter((record) => isDocument(record) && !savedIds.has(record.id))
    .map((record) => record.id);
  // put can't skip these itself: some shapes' validation returns a new object
  // even when nothing changed. Records are plain JSON, and one that differs
  // only in key order is merely replaced.
  const changed = saved.filter((record) => {
    const current = store.get(record.id);
    return !current || JSON.stringify(current) !== JSON.stringify(record);
  });
  store.mergeRemoteChanges(() => {
    store.remove(removed);
    store.put(changed);
  });
}

export function attachCanvasController(deps: CanvasControllerDeps) {
  const { editor } = deps;
  const session = createSessionStateSnapshotSignal(editor.store);
  let detached = false;
  // Stays false for a board never saved, which loads nothing
  let hasDocument = false;
  const copies = attachCopies(editor);
  const arrows = attachArrows({
    editor,
    viewerDid: deps.ownerDid,
    copies: copies.byUrl,
    // Only read after the board has loaded
    fetchedConnections: () => links.fetchedConnections(),
  });
  const links = attachLinkCards(deps, arrows.reconcileSoon);
  const connectionDeleted = (connectionId: string) => {
    arrows.dropConnection(connectionId);
    invalidateAfterConnectionDeleted(deps.queryClient, { connectionId });
  };
  const connections = attachConnections({
    editor,
    server: deps.server,
    onConnectionCreated: (connection) =>
      invalidateAfterConnectionCreated(deps.queryClient, connection),
    onConnectionDeleted: connectionDeleted,
    onServerError: deps.onServerError,
  });
  const connectionEdits = attachConnectionEdits({
    editor,
    server: deps.server,
    undoToast: connections.undoToast,
    onConnectionUpdated: (connectionId) =>
      invalidateAfterConnectionUpdated(deps.queryClient, { connectionId }),
    onConnectionDeleted: connectionDeleted,
    onServerError: deps.onServerError,
  });
  const quickAdd = attachQuickAdd(editor, links.placeLink);
  const popupCard = createPopupCard(editor);
  const renameIfUnnamed = async (name: string) => {
    const canvas = await deps.storage.getCanvas(deps.canvasId);
    if (canvas?.name !== DEFAULT_CANVAS_NAME) return;
    await deps.storage.renameCanvas(deps.canvasId, name);
  };
  const canPlace = () => !detached && !editor.getIsReadonly();
  const seedFailed = () =>
    deps.onServerError(
      "Couldn't load this link's connections. Reload to try again.",
    );
  const linkSeed = attachLinkSeed({
    editor,
    fetchLinks: links.fetchLinks,
    linkOf: links.linkOf,
    cardHeight: links.cardHeight,
    placeLinks: links.placeLinks,
    rename: renameIfUnnamed,
    onFailed: seedFailed,
    onProgress: deps.onSeedProgress,
    canPlace,
  });
  const collectionFrames = attachCollectionFrames({
    editor,
    server: deps.server,
    fetchLinks: links.fetchLinks,
    cardHeight: links.cardHeight,
    placeLinks: links.placeLinks,
    countLines: links.countLines,
    rename: renameIfUnnamed,
    onFailed: deps.onServerError,
    onProgress: deps.onSeedProgress,
    canPlace,
  });
  const openCollection = (collectionId: string, startsBoard: boolean) =>
    collectionFrames.open(collectionId, startsBoard).catch((error) => {
      console.warn(error);
      deps.onServerError(COLLECTION_LOAD_FAILED);
    });
  // A tab that opens the board read-only adds the collection once it gets to
  // write the board, as when the tab writing it closes
  let pendingCollection: string | null = null;
  const mediaReveals = createMediaReveals();
  const refreshLoop = attachRefreshLoop({
    boardUrls: links.boardUrls,
    urlsInView: links.urlsInView,
    fetchLinks: links.fetchLinks,
    everyTimedRefresh: deps.everyTimedRefresh,
  });
  const board = deps.storage.openBoard(
    deps.canvasId,
    {
      ownerDid: deps.ownerDid,
      runningSchema: editor.store.schema.serialize(),
      source: {
        getDocument: () => ({
          schema: editor.store.schema.serialize(),
          store: editor.store.serialize('document'),
        }),
        getSession: () => ({
          editor: session.get() ?? {},
          arrows: arrows.saveSettings(),
        }),
        getThumbnail: () => captureThumbnail(editor),
        // Listeners hear about changes on the next frame, which never comes
        // in a hidden tab
        reportPendingChanges: () => editor.store._flushHistory(),
      },
    },
    {
      onLoad(document, saved, known) {
        hasDocument = document !== null;
        links.showKnownLinks(known);
        arrows.restoreSettings(saved?.arrows);
        loadSnapshot(editor.store, {
          document: (document ?? undefined) as TLStoreSnapshot | undefined,
          session: saved?.editor as TLSessionStateSnapshot | undefined,
        });
        editor.clearHistory();
      },
      onRemoteSave: (document) => applyRemoteSave(editor, document),
      onRoleChange(role) {
        const wasReadonly = editor.getIsReadonly();
        editor.updateInstanceState({ isReadonly: role !== 'writer' });
        if (role === 'writer' && wasReadonly) {
          // The arrows came from the former writer, which may have been behind
          arrows.reconcile();
          deps.onWritingAgain();
          if (pendingCollection) {
            // Joins a board another tab was writing, so it's one step of undo
            void openCollection(pendingCollection, false);
            pendingCollection = null;
          }
        }
        if (role === 'newer-version') deps.onNewerVersion();
      },
      onTakenOver: deps.onTakenOver,
      onSaveError: deps.onStorageError,
    },
  );
  // Remote changes are saved too, not only the user's
  const unlisten = editor.store.listen(() => board.documentChanged(), {
    scope: 'document',
    source: 'all',
  });
  const loaded = board.opened.then(async (status) => {
    if (status === 'ready' && !detached) {
      links.sizeAll();
      arrows.reconcile();
      refreshLoop.start();
      // Loading lasts until the links are placed, rather than showing an
      // empty board meanwhile
      if (deps.seedCollectionId) {
        if (editor.getIsReadonly()) pendingCollection = deps.seedCollectionId;
        else await openCollection(deps.seedCollectionId, !hasDocument);
      } else if (deps.seedUrl && !hasDocument && !editor.getIsReadonly()) {
        await linkSeed.seed(deps.seedUrl).catch((error) => {
          console.warn(error);
          seedFailed();
        });
      }
    }
    return status;
  });

  return {
    loaded,
    quickAdd,
    copies,
    popupCard,
    linkSeed,
    collectionFrames,
    mediaReveals,
    arrowView: arrows.view,
    connectionPicker: connections.picker,
    undoToast: connections.undoToast,
    connectionEdits,
    refreshFailed: refreshLoop.failed,
    takeOver: () => board.takeOver(),
    async detach() {
      detached = true;
      quickAdd.detach();
      collectionFrames.detach();
      connections.detach();
      refreshLoop.detach();
      arrows.detach();
      const linksDetached = links.detach();
      // Close before unlistening: its flush reports pending changes through
      // the listener
      const closed = board.close();
      unlisten();
      await Promise.all([closed, linksDetached]);
    },
  };
}

export type CanvasController = ReturnType<typeof attachCanvasController>;
