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

export const CANVAS_DB_NAME = 'semble-canvas';
const DB_VERSION = 1;
const CANVASES = 'canvases';
const DOCUMENTS = 'documents';
const THUMBNAILS = 'thumbnails';
const LINK_INFO = 'linkInfo';

const SAVE_THROTTLE_MS = 500;

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

  constructor(private options: Options) {}

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
        // Unused until thumbnails and link cards land; created now to skip a
        // version upgrade
        db.createObjectStore(THUMBNAILS);
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
    return record;
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
    let dirty = false;
    let stopped = false;
    let writing = Promise.resolve();

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

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return {
      documentChanged() {
        if (stopped) return;
        dirty = true;
        timer ??= setTimeout(() => void flush(), SAVE_THROTTLE_MS);
      },
      stop() {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
        const flushed = flush();
        stopped = true;
        return flushed;
      },
    };
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
        tldrawVersion: this.options.tldrawVersion,
        updatedAt: new Date().toISOString(),
      });
      tx.objectStore(DOCUMENTS).put(doc, id);
    };
    await transactionDone(tx);
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
