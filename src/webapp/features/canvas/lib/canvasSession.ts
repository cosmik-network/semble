import { createContext, use } from 'react';
import { atom, TLShapeId, VecLike } from 'tldraw';
import type { CanvasConnection } from '../types';

export interface QuickAddState {
  point: VecLike;
  // The new card gets connected from this card
  connectFrom?: TLShapeId;
}

export interface TrailState {
  ids: TLShapeId[];
  index: number;
}

export interface CollectionDrop {
  collection: { id: string; cardCount: number };
  point: VecLike;
}

// Per-editor state shared by the sync hooks and the canvas overlays
export class CanvasSession {
  readonly pendingArrowId = atom<TLShapeId | null>('pendingArrowId', null);
  // A user-drawn frame waiting to be named as a collection, or kept plain
  readonly pendingFrameId = atom<TLShapeId | null>('pendingFrameId', null);
  // Saved arrows the user removed, awaiting confirmation to delete the connections
  readonly pendingDeletes = atom<CanvasConnection[]>('pendingDeletes', []);

  readonly trayOpen = atom('trayOpen', false);
  // The card shown in the side panel
  readonly panelShapeId = atom<TLShapeId | null>('panelShapeId', null);
  readonly quickAdd = atom<QuickAddState | null>('quickAdd', null);
  // The card whose similar strip is open
  readonly similarAnchorId = atom<TLShapeId | null>('similarAnchorId', null);
  // A collection dragged in from the library, waiting to be placed
  readonly collectionDrop = atom<CollectionDrop | null>('collectionDrop', null);
  readonly findOpen = atom('findOpen', false);
  readonly minimapOpen = atom('minimapOpen', false);
  // Hides every connection arrow on the board
  readonly connectionsHidden = atom('connectionsHidden', false);
  // A walkthrough of cards being presented, one at a time
  readonly trail = atom<TrailState | null>('trail', null);
  // The pile cascaded open under the pointer
  readonly fannedStackId = atom<string | null>('fannedStackId', null);
  readonly renamingCollectionId = atom<TLShapeId | null>(
    'renamingCollectionId',
    null,
  );
  // The card whose connect modal is open
  readonly connectShapeId = atom<TLShapeId | null>('connectShapeId', null);
  readonly addToCollectionShapeId = atom<TLShapeId | null>(
    'addToCollectionShapeId',
    null,
  );

  // Links being saved to the library right now
  readonly savingUrls = atom<ReadonlySet<string>>('savingUrls', new Set());
  // Links or collection ids changed from here: while the request runs, and the data
  // fetched before it finished, library sync leaves them alone
  private touched = new Map<string, number>();
  private busy = new Map<string, number>();

  touch(key: string) {
    this.touched.set(key, Date.now());
  }

  begin(key: string) {
    this.busy.set(key, (this.busy.get(key) ?? 0) + 1);
  }

  end(key: string) {
    this.busy.set(key, Math.max(0, (this.busy.get(key) ?? 0) - 1));
    this.touch(key);
  }

  async track<T>(key: string, work: Promise<T>) {
    this.begin(key);
    try {
      return await work;
    } finally {
      this.end(key);
    }
  }

  touchedSince(key: string, time: number) {
    return !!this.busy.get(key) || (this.touched.get(key) ?? 0) > time;
  }

  private server = new Map<string, CanvasConnection>();
  // Created or edited here but not yet reflected in fetched data
  private local = new Map<string, CanvasConnection>();
  private deleted = new Set<string>();
  readonly version = atom('connectionsVersion', 0);

  constructor(readonly userId: string) {}

  get(id: string) {
    if (this.deleted.has(id)) return undefined;
    return this.local.get(id) ?? this.server.get(id);
  }

  all() {
    const merged = new Map(this.server);
    this.local.forEach((c, id) => merged.set(id, c));
    this.deleted.forEach((id) => merged.delete(id));
    return Array.from(merged.values());
  }

  setServer(connections: CanvasConnection[]) {
    this.server = new Map(connections.map((c) => [c.id, c]));
    this.local.forEach((c, id) => {
      const fetched = this.server.get(id);
      if (fetched && sameConnection(fetched, c)) this.local.delete(id);
    });
    this.deleted.forEach((id) => {
      if (!this.server.has(id)) this.deleted.delete(id);
    });
    this.bump();
  }

  putLocal(connection: CanvasConnection) {
    this.local.set(connection.id, connection);
    this.bump();
  }

  markDeleted(id: string) {
    this.local.delete(id);
    this.deleted.add(id);
    this.bump();
  }

  unmarkDeleted(id: string) {
    this.deleted.delete(id);
    this.bump();
  }

  private bump() {
    this.version.update((v) => v + 1);
  }
}

const sameConnection = (a: CanvasConnection, b: CanvasConnection) =>
  a.type === b.type &&
  a.sourceUrl === b.sourceUrl &&
  a.targetUrl === b.targetUrl;

export const CanvasSessionContext = createContext<CanvasSession | null>(null);

export function useCanvasSession() {
  const session = use(CanvasSessionContext);
  if (!session)
    throw new Error('useCanvasSession must be used within CanvasSync');
  return session;
}
