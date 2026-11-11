import type { CanvasRecord } from '@semble/types';

export type { CanvasRecord };

// What save returns when another writer moved the board past the revision
// this save built on
export interface CanvasRevisionConflict {
  conflict: true;
  currentRevision: number;
}

export type SaveResult =
  | { conflict: false; revision: number; updatedAt: Date }
  | CanvasRevisionConflict;

// Postgres row plus the board's objects in ICanvasObjectStore. Documents are
// stored under per-save keys, so a losing concurrent writer's bytes are never
// the ones a revision points at.
export interface ICanvasRepository {
  create(ownerDid: string, id?: string, name?: string): Promise<CanvasRecord>;
  // Most recently updated first
  list(ownerDid: string): Promise<CanvasRecord[]>;
  get(ownerDid: string, id: string): Promise<CanvasRecord | null>;
  rename(
    ownerDid: string,
    id: string,
    name: string,
  ): Promise<CanvasRecord | null>;
  // Copies the record, document and thumbnail under a fresh id
  duplicate(ownerDid: string, id: string): Promise<CanvasRecord | null>;
  delete(ownerDid: string, id: string): Promise<boolean>;
  // The board's document bytes, null when it has never been saved
  open(
    ownerDid: string,
    id: string,
  ): Promise<{ record: CanvasRecord; document: Buffer | null } | null>;
  // Puts the serialized document in the object store, then claims the next
  // revision against baseRevision in one conditional update. On conflict the
  // just-written object is removed and the board's current revision returned.
  save(
    ownerDid: string,
    id: string,
    baseRevision: number,
    document: Buffer,
    update: {
      tldrawVersion: string;
      linkCount: number;
      schemaSequences: Record<string, number>;
    },
  ): Promise<SaveResult>;
  // A JPEG's bytes, null when none was captured
  getThumbnail(id: string): Promise<Buffer | null>;
  saveThumbnail(id: string, thumbnail: Buffer | null): Promise<void>;
}
