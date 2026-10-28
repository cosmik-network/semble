import type { LinkInfo } from '../server/canvasServer';

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

export interface CanvasSummary extends CanvasRecord {
  // An image data URL, captured when edits pause and when the board is left
  thumbnail: string | null;
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

// A link as last fetched, shown when the board opens until it's fetched again
export interface KnownLink {
  link: LinkInfo;
  fetchedAt: number;
}

export type KnownLinks = Record<string, KnownLink>;

export type OpenedCanvas =
  | { status: 'missing' }
  | { status: 'newer-version' }
  | {
      status: 'ready';
      record: CanvasRecord;
      document: CanvasDocument | null;
      session: CanvasSession | null;
      links: KnownLinks;
    };

export interface CanvasSource {
  getDocument(): CanvasDocument;
  getSession(): CanvasSession;
  // Null when there's nothing to draw. Rejects when the capture fails, which
  // keeps the last thumbnail.
  getThumbnail(): Promise<string | null>;
  // Called before each save, to report changes the board hasn't yet passed to
  // documentChanged
  reportPendingChanges(): void;
}

export type BoardStatus = 'ready' | 'newer-version';

// writer: this tab saves the board. reader: another tab does, and this one
// shows its saves. newer-version: a newer app saved it, so this one can't.
export type BoardRole = 'writer' | 'reader' | 'newer-version';

export interface BoardOptions {
  // Creates the board for this owner when it doesn't exist yet
  ownerDid: string;
  runningSchema: CanvasSchema;
  // Read while this tab writes the board
  source: CanvasSource;
}

export interface BoardEvents {
  // The saved board, with this tab's last session and the board's last known
  // links, before opened resolves
  onLoad(
    document: CanvasDocument | null,
    session: CanvasSession | null,
    links: KnownLinks,
  ): void;
  // Each save another tab makes while this one reads, newest last. Never
  // called while this tab writes.
  onRemoteSave(document: CanvasDocument): void;
  // Called with the first role before opened resolves, then on each change
  onRoleChange(role: BoardRole): void;
  // Another tab took the board over. Edits since the last save are lost.
  onTakenOver(): void;
  onSaveError(error: unknown): void;
}

// One tab writes each board. The others read and can take over, and when the
// writer's tab closes, one of them writes instead.
export interface BoardSession {
  opened: Promise<BoardStatus>;
  // Ignored unless this tab writes
  documentChanged(): void;
  // Ignored while writing; does nothing when a newer app has saved the board
  takeOver(): Promise<void>;
  // Saves what's pending and lets another tab write
  close(): Promise<void>;
}

export interface CanvasStorage {
  createCanvas(ownerDid: string, id?: string): Promise<CanvasRecord>;
  // Most recently edited first
  listCanvases(ownerDid: string): Promise<CanvasSummary[]>;
  // Called after each change to the list: a board added, renamed, saved or removed
  subscribe(listener: () => void): () => void;
  getCanvas(id: string): Promise<CanvasRecord | null>;
  renameCanvas(id: string, name: string): Promise<void>;
  // The copy gets the document, thumbnail and link info, not the session
  duplicateCanvas(id: string): Promise<CanvasRecord>;
  deleteCanvas(id: string): Promise<void>;
  // The board as last saved, without opening it
  openCanvas(id: string, runningSchema: CanvasSchema): Promise<OpenedCanvas>;
  // Replaces the board's last known links. Any tab may write them.
  saveKnownLinks(id: string, links: KnownLinks): Promise<void>;
  openBoard(
    id: string,
    options: BoardOptions,
    events: BoardEvents,
  ): BoardSession;
}
