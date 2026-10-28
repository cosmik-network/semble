export const DEFAULT_CANVAS_NAME = 'Untitled canvas';

// Mirrors the future Postgres row. The document and thumbnail are stored
// apart so listing boards doesn't read them.
export interface CanvasRecord {
  id: string;
  ownerDid: string;
  name: string;
  tldrawVersion: string;
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasSchema {
  schemaVersion: 2;
  sequences: Record<string, number>;
}

export interface CanvasDocument {
  schema: CanvasSchema;
  store: Record<string, unknown>;
}

export interface CanvasSession {
  editor: object;
}

export type OpenedCanvas =
  | { status: 'missing' }
  | { status: 'newer-version' }
  | {
      status: 'ready';
      record: CanvasRecord;
      document: CanvasDocument | null;
      session: CanvasSession | null;
    };

export interface CanvasSource {
  getDocument(): CanvasDocument;
  getSession(): CanvasSession;
  // Called before each save, to report changes the board hasn't yet passed to
  // documentChanged
  reportPendingChanges(): void;
}

export interface CanvasSaver {
  documentChanged(): void;
  stop(): Promise<void>;
}

export interface CanvasStorage {
  createCanvas(ownerDid: string, id?: string): Promise<CanvasRecord>;
  openCanvas(id: string, runningSchema: CanvasSchema): Promise<OpenedCanvas>;
  startSaving(
    id: string,
    source: CanvasSource,
    onError: (error: unknown) => void,
  ): CanvasSaver;
}
