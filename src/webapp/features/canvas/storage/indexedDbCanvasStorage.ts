import {
  DEFAULT_CANVAS_NAME,
  type CanvasDocument,
  type CanvasRecord,
  type CanvasSaver,
  type CanvasSchema,
  type CanvasSession,
  type CanvasSource,
  type CanvasStorage,
  type OpenedCanvas,
} from './canvasStorage';
import { countLinks } from '../model/linkCards';

export const CANVAS_DB_NAME = 'semble-canvas';
const DB_VERSION = 1;
const CANVASES = 'canvases';
const DOCUMENTS = 'documents';
const THUMBNAILS = 'thumbnails';
const LINK_INFO = 'linkInfo';

const SAVE_THROTTLE_MS = 500;
export const THUMBNAIL_IDLE_MS = 2000;

const sessionKey = (id: string) => `semble:canvas-session:${id}`;

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
  });
}

// A sequence the running code lacks, or one past its last migration, was
// written by a newer app; tldraw can't migrate it down
function isNewerSchema(saved: CanvasSchema, running: CanvasSchema) {
  return Object.entries(saved.sequences).some(
    ([id, version]) =>
      running.sequences[id] === undefined || version > running.sequences[id],
  );
}

interface Options {
  tldrawVersion: string;
  indexedDB?: IDBFactory;
}

export class IndexedDbCanvasStorage implements CanvasStorage {
  private db: Promise<IDBDatabase> | null = null;
  private listeners = new Set<() => void>();

  constructor(private options: Options) {}

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private changed() {
    this.listeners.forEach((listener) => listener());
  }

  private openDb() {
    this.db ??= new Promise((resolve, reject) => {
      const req = (this.options.indexedDB ?? indexedDB).open(
        CANVAS_DB_NAME,
        DB_VERSION,
      );
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore(CANVASES, { keyPath: 'id' }).createIndex(
          'ownerDid',
          'ownerDid',
        );
        db.createObjectStore(DOCUMENTS);
        db.createObjectStore(THUMBNAILS);
        // Unused until link cards land; created now to skip a version upgrade
        db.createObjectStore(LINK_INFO);
      };
      req.onsuccess = () => {
        const db = req.result;
        // Don't block site-data clearing; later writes fail and get reported
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  async createCanvas(ownerDid: string, id: string = crypto.randomUUID()) {
    const now = new Date().toISOString();
    const record: CanvasRecord = {
      id,
      ownerDid,
      name: DEFAULT_CANVAS_NAME,
      tldrawVersion: this.options.tldrawVersion,
      linkCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const tx = (await this.openDb()).transaction(CANVASES, 'readwrite');
    tx.objectStore(CANVASES).add(record);
    await transactionDone(tx);
    this.changed();
    return record;
  }

  async listCanvases(ownerDid: string) {
    const tx = (await this.openDb()).transaction(
      [CANVASES, THUMBNAILS],
      'readonly',
    );
    const records = await request<CanvasRecord[]>(
      tx.objectStore(CANVASES).index('ownerDid').getAll(ownerDid),
    );
    const thumbnails = await Promise.all(
      records.map((record) =>
        request<string | undefined>(tx.objectStore(THUMBNAILS).get(record.id)),
      ),
    );
    return records
      .map((record, i) => ({ ...record, thumbnail: thumbnails[i] ?? null }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCanvas(id: string) {
    const tx = (await this.openDb()).transaction(CANVASES, 'readonly');
    const record = await request<CanvasRecord | undefined>(
      tx.objectStore(CANVASES).get(id),
    );
    return record ?? null;
  }

  async renameCanvas(id: string, name: string) {
    const tx = (await this.openDb()).transaction(CANVASES, 'readwrite');
    const canvases = tx.objectStore(CANVASES);
    const req = canvases.get(id);
    req.onsuccess = () => {
      const record: CanvasRecord | undefined = req.result;
      if (record) {
        canvases.put({ ...record, name, updatedAt: new Date().toISOString() });
      }
    };
    await transactionDone(tx);
    this.changed();
  }

  async duplicateCanvas(id: string) {
    const tx = (await this.openDb()).transaction(
      [CANVASES, DOCUMENTS, THUMBNAILS, LINK_INFO],
      'readwrite',
    );
    const [record, doc, thumbnail, linkInfo] = await Promise.all([
      request<CanvasRecord | undefined>(tx.objectStore(CANVASES).get(id)),
      request<CanvasDocument | undefined>(tx.objectStore(DOCUMENTS).get(id)),
      request<string | undefined>(tx.objectStore(THUMBNAILS).get(id)),
      request<unknown>(tx.objectStore(LINK_INFO).get(id)),
    ]);
    if (!record) throw new Error(`Canvas ${id} doesn't exist`);
    const now = new Date().toISOString();
    const copy: CanvasRecord = {
      ...record,
      id: crypto.randomUUID(),
      name: `Copy of ${record.name}`,
      createdAt: now,
      updatedAt: now,
    };
    tx.objectStore(CANVASES).add(copy);
    if (doc) tx.objectStore(DOCUMENTS).add(doc, copy.id);
    if (thumbnail) tx.objectStore(THUMBNAILS).add(thumbnail, copy.id);
    if (linkInfo) tx.objectStore(LINK_INFO).add(linkInfo, copy.id);
    await transactionDone(tx);
    this.changed();
    return copy;
  }

  async deleteCanvas(id: string) {
    const stores = [CANVASES, DOCUMENTS, THUMBNAILS, LINK_INFO];
    const tx = (await this.openDb()).transaction(stores, 'readwrite');
    for (const store of stores) tx.objectStore(store).delete(id);
    await transactionDone(tx);
    this.changed();
    try {
      localStorage.removeItem(sessionKey(id));
    } catch {
      // A leftover session is harmless: it's keyed by an id nothing reuses
    }
  }

  async openCanvas(
    id: string,
    runningSchema: CanvasSchema,
  ): Promise<OpenedCanvas> {
    const tx = (await this.openDb()).transaction(
      [CANVASES, DOCUMENTS],
      'readonly',
    );
    const [record, doc] = await Promise.all([
      request<CanvasRecord | undefined>(tx.objectStore(CANVASES).get(id)),
      request<CanvasDocument | undefined>(tx.objectStore(DOCUMENTS).get(id)),
    ]);
    if (!record) return { status: 'missing' };
    if (doc && isNewerSchema(doc.schema, runningSchema)) {
      return { status: 'newer-version' };
    }
    return {
      status: 'ready',
      record,
      document: doc ?? null,
      session: readSession(id),
    };
  }

  startSaving(
    id: string,
    source: CanvasSource,
    onError: (error: unknown) => void,
  ): CanvasSaver {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let thumbnailTimer: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;
    let thumbnailStale = false;
    let stopped = false;
    let writing = Promise.resolve();
    let writingThumbnail = Promise.resolve();
    let captures = 0;

    const write = async () => {
      try {
        localStorage.setItem(
          sessionKey(id),
          JSON.stringify(source.getSession()),
        );
      } catch (error) {
        onError(error);
      }
      if (!dirty) return;
      dirty = false;
      try {
        await this.writeDocument(id, source.getDocument());
      } catch (error) {
        onError(error);
      }
    };

    // Writes queue behind each other, so stop() resolves once all have landed
    const flush = () => {
      source.reportPendingChanges();
      if (timer) clearTimeout(timer);
      timer = null;
      // A failed write mustn't block the ones after it
      writing = writing.catch(() => {}).then(write);
      return writing;
    };

    // Capturing is too slow to repeat on every save, so it waits for a pause
    const captureThumbnail = () => {
      if (thumbnailTimer) clearTimeout(thumbnailTimer);
      thumbnailTimer = null;
      if (!thumbnailStale) return writingThumbnail;
      thumbnailStale = false;
      // Started now, while a closing board can still draw itself
      const captured = source.getThumbnail();
      const capture = ++captures;
      writingThumbnail = captured.then(
        async (thumbnail) => {
          // A slower, older capture mustn't overwrite a newer one
          if (capture !== captures) return;
          try {
            await this.writeThumbnail(id, thumbnail);
          } catch (error) {
            onError(error);
          }
        },
        // Keep the last thumbnail rather than report a save error
        () => {},
      );
      return writingThumbnail;
    };

    const leave = async () => {
      await Promise.all([flush(), captureThumbnail()]);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void leave();
    };
    const onPageHide = () => void leave();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return {
      documentChanged() {
        if (stopped) return;
        dirty = true;
        thumbnailStale = true;
        timer ??= setTimeout(() => void flush(), SAVE_THROTTLE_MS);
        if (thumbnailTimer) clearTimeout(thumbnailTimer);
        thumbnailTimer = setTimeout(
          () => void captureThumbnail(),
          THUMBNAIL_IDLE_MS,
        );
      },
      stop() {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
        const left = leave();
        stopped = true;
        return left;
      },
    };
  }

  private async writeThumbnail(id: string, thumbnail: string | null) {
    const tx = (await this.openDb()).transaction(
      [CANVASES, THUMBNAILS],
      'readwrite',
    );
    const req = tx.objectStore(CANVASES).getKey(id);
    req.onsuccess = () => {
      if (req.result === undefined) return;
      const thumbnails = tx.objectStore(THUMBNAILS);
      if (thumbnail) thumbnails.put(thumbnail, id);
      else thumbnails.delete(id);
    };
    await transactionDone(tx);
    this.changed();
  }

  private async writeDocument(id: string, doc: CanvasDocument) {
    const tx = (await this.openDb()).transaction(
      [CANVASES, DOCUMENTS],
      'readwrite',
    );
    const canvases = tx.objectStore(CANVASES);
    const req = canvases.get(id);
    req.onsuccess = () => {
      const record: CanvasRecord | undefined = req.result;
      // Deleted while open: don't leave an orphan document behind
      if (!record) return;
      canvases.put({
        ...record,
        linkCount: countLinks(doc.store),
        tldrawVersion: this.options.tldrawVersion,
        updatedAt: new Date().toISOString(),
      });
      tx.objectStore(DOCUMENTS).put(doc, id);
    };
    await transactionDone(tx);
    this.changed();
  }
}

function readSession(id: string): CanvasSession | null {
  try {
    const saved = localStorage.getItem(sessionKey(id));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
