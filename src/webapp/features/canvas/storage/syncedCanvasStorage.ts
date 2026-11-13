import {
  IndexedDbCanvasStorage,
  isNewerSchema,
} from './indexedDbCanvasStorage';
import {
  openBoardSession,
  type CanvasClaim,
  type ClaimOptions,
} from './boardSession';
import { ApiError } from '@/api-client/errors';
import type { CanvasClient } from '@/api-client/clients/CanvasClient';
import { countLinks } from '../model/linkCards';
import type {
  BoardEvents,
  BoardOptions,
  BoardSession,
  CanvasDocument,
  CanvasRecord,
  CanvasSchema,
  CanvasSource,
  CanvasStorage,
  CanvasSummary,
  KnownLinks,
  OpenedCanvas,
} from './canvasStorage';

// A server record, as @semble/types defines it: the webapp's CanvasRecord
// plus revision and schemaSequences
type ServerRecord = {
  id: string;
  ownerDid: string;
  name: string;
  tldrawVersion: string;
  linkCount: number;
  revision: number;
  schemaSequences: Record<string, number>;
  hasThumbnail: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServerSummary = ServerRecord & { thumbnail: string | null };

export interface SyncedCanvasStorageOptions {
  tldrawVersion: string;
  // Lazy, so a session started after this module loads is picked up
  createClient: () => CanvasClient;
}

// Server-authoritative storage on top of the local one. The local
// IndexedDB keeps governing which tab writes (Web Locks) and holds the
// session, known links and an offline copy of every board; the server holds
// the boards themselves. One writer across devices: a save that lost the
// race adopts the winner's document, losing the local edits since the last
// save — the same deal a tab take-over already offers.
export class SyncedCanvasStorage implements CanvasStorage {
  // The revision each board's next save builds on
  private revisions = new Map<string, number>();
  // Each open board's events, keyed by board id
  private boardEvents = new Map<string, BoardEvents>();
  private migrating = new Set<string>();

  constructor(
    private local: IndexedDbCanvasStorage,
    private options: SyncedCanvasStorageOptions,
  ) {}

  private client() {
    return this.options.createClient();
  }

  subscribe(listener: () => void) {
    return this.local.subscribe(listener);
  }

  async createCanvas(ownerDid: string, id?: string): Promise<CanvasRecord> {
    try {
      const record = await this.client().create({ id });
      this.revisions.set(record.id, record.revision);
      await this.ensureLocal(record);
      return this.toRecord(record);
    } catch (error) {
      console.warn('[canvas] server create failed, staying local', error);
      // Offline or signed out: a local-only board, pushed by migration once
      // the server is reachable again
      return this.local.createCanvas(ownerDid, id);
    }
  }

  async listCanvases(ownerDid: string): Promise<CanvasSummary[]> {
    try {
      const remote = await this.client().list(true);
      void this.migrateLocalCanvases(
        ownerDid,
        remote.map((r) => r.id),
      );
      // Boards that never made it to the server still show until pushed
      const remoteIds = new Set(remote.map((record) => record.id));
      const localOnly = (await this.local.listCanvases(ownerDid)).filter(
        (canvas) => !remoteIds.has(canvas.id),
      );
      // Bind explicitly: passing this.toSummary bare loses `this`, and the
      // TypeError lands in this method's catch as a phantom "server failed"
      return [...remote.map((record) => this.toSummary(record)), ...localOnly];
    } catch (error) {
      // A silent fallback here reads as "my boards vanished" on any other
      // device, so always say why the local list is being shown
      console.warn('[canvas] server list failed, showing local only', error);
      return this.local.listCanvases(ownerDid);
    }
  }

  async getCanvas(id: string): Promise<CanvasRecord | null> {
    try {
      return this.toRecord(await this.client().get(id));
    } catch (error) {
      console.warn('[canvas] server get failed, using local', error);
      return this.local.getCanvas(id);
    }
  }

  async renameCanvas(id: string, name: string): Promise<void> {
    let renamedRemotely = false;
    try {
      await this.client().rename({ canvasId: id, name });
      renamedRemotely = true;
    } catch {
      // Offline: rename locally; the server copy keeps its old name until
      // the next successful save reconciles... it doesn't — renames aren't
      // part of saves. Accepted for v1; fix by re-trying renames later.
    }
    if (!renamedRemotely) {
      await this.local.renameCanvas(id, name);
    } else {
      const record = await this.client().get(id);
      await this.ensureLocal(record);
    }
  }

  async duplicateCanvas(id: string): Promise<CanvasRecord> {
    try {
      const copy = await this.client().duplicate({ canvasId: id });
      this.revisions.set(copy.id, copy.revision);
      await this.ensureLocal(copy);
      return this.toRecord(copy);
    } catch {
      return this.local.duplicateCanvas(id);
    }
  }

  async deleteCanvas(id: string): Promise<void> {
    try {
      await this.client().delete({ canvasId: id });
    } catch (error) {
      // Fine when the board never reached the server or is already gone;
      // anything else still deletes locally — deletion is deliberate
      if (!(error instanceof ApiError && error.statusCode === 404)) {
        console.warn('[canvas] deleting server copy failed', error);
      }
    }
    this.revisions.delete(id);
    await this.local.deleteCanvas(id);
  }

  async openCanvas(
    id: string,
    runningSchema: CanvasSchema,
  ): Promise<OpenedCanvas> {
    try {
      const { record, document } = await this.client().open(id);
      const savedSchema: CanvasSchema = {
        schemaVersion: 2,
        sequences: record.schemaSequences,
      };
      if (document && isNewerSchema(savedSchema, runningSchema)) {
        return { status: 'newer-version' };
      }
      this.revisions.set(id, record.revision);
      // Null (never saved remotely) leaves any local copy alone, so a
      // half-finished migration can't destroy offline edits
      await this.ensureLocal(record, document ?? undefined);
      // Session and links are per-browser state the local storage holds
      const local = await this.local
        .openCanvas(id, runningSchema)
        .catch(() => null);
      const localReady =
        local && local.status === 'ready'
          ? local
          : { session: null, links: {} as KnownLinks };
      return {
        status: 'ready',
        record: this.toRecord(record),
        document: document ?? null,
        session: localReady.session,
        links: localReady.links,
      };
    } catch {
      // Unknown to the server (never migrated, or new), or offline: the
      // local answer sorts out which, and boardSession creates what's missing
      return this.local.openCanvas(id, runningSchema);
    }
  }

  async saveKnownLinks(id: string, links: KnownLinks): Promise<void> {
    // A client cache of server data; nothing to sync
    await this.local.saveKnownLinks(id, links);
  }

  openBoard(
    id: string,
    options: BoardOptions,
    events: BoardEvents,
  ): BoardSession {
    // Saves started by this board carry its events, so a lost race can be
    // recovered by adopting the winner's document
    this.boardEvents.set(id, events);
    const session = openBoardSession(this, id, options, events);
    return {
      ...session,
      close: async () => {
        await session.close();
        this.boardEvents.delete(id);
      },
    };
  }

  // BoardStorage: tab arbitration stays local; document saves mirror to the
  // server

  claimCanvas(id: string, onLost: () => void, claimOptions?: ClaimOptions) {
    return this.local.claimCanvas(id, onLost, claimOptions);
  }

  watchSaves(id: string, listener: () => void) {
    return this.local.watchSaves(id, listener);
  }

  startSaving(
    claim: CanvasClaim,
    source: CanvasSource,
    onError: (error: unknown) => void,
  ) {
    const events = this.boardEvents.get(claim.id);
    return this.local.startSaving(claim, source, onError, {
      onDocumentWritten: async (document, outcome) => {
        if (outcome !== 'written') return;
        try {
          await this.saveRemotely(claim.id, document, events);
        } catch (error) {
          // The local copy saved; the server copy catches up on the next
          // save, which retries with the same base revision
          onError(error);
        }
      },
      onThumbnailWritten: async (thumbnail) => {
        try {
          await this.client().saveThumbnail({
            canvasId: claim.id,
            thumbnail,
          });
        } catch {
          // Cosmetic: keep the local one and let the next capture retry
        }
      },
    });
  }

  private async saveRemotely(
    id: string,
    document: CanvasDocument,
    // The open board's events; adoption is skipped without them (migration)
    events?: BoardEvents,
  ) {
    const result = await this.client().save({
      canvasId: id,
      baseRevision: this.revisions.get(id) ?? 0,
      document,
      linkCount: countLinks(document.store),
      tldrawVersion: this.options.tldrawVersion,
    });
    if ('conflict' in result) {
      // Another device saved first: adopt its board. Edits since this tab's
      // last successful save are lost, as with a tab take-over.
      this.revisions.set(id, result.currentRevision);
      const opened = await this.client().open(id);
      if (opened.document) {
        await this.ensureLocal(opened.record, opened.document);
        events?.onRemoteSave(opened.document);
      }
      return;
    }
    this.revisions.set(id, result.revision);
  }

  // Makes sure a local row and document exist for a server board, so
  // sessions, links and the offline copy keep working
  private async ensureLocal(record: ServerRecord, document?: CanvasDocument) {
    if (!(await this.local.getCanvas(record.id))) {
      await this.local.createCanvas(record.ownerDid, record.id);
    }
    await this.local.applyRemoteRecord(this.toRecord(record), document);
  }

  private toRecord(record: ServerRecord): CanvasRecord {
    return {
      id: record.id,
      ownerDid: record.ownerDid,
      name: record.name,
      // The server row carries '' until the first save
      tldrawVersion: record.tldrawVersion || this.options.tldrawVersion,
      linkCount: record.linkCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toSummary(record: ServerSummary): CanvasSummary {
    return { ...this.toRecord(record), thumbnail: record.thumbnail };
  }

  // Pushes boards that only exist locally (created offline, or before server
  // sync shipped) once per owner. Runs in the background: lists show the
  // local copies until it lands, and listeners fire when it does.
  private async migrateLocalCanvases(ownerDid: string, remoteIds: string[]) {
    const flagKey = `semble:canvas-migrated:${ownerDid}`;
    if (this.migrating.has(ownerDid)) return;
    try {
      if (localStorage.getItem(flagKey)) return;
      localStorage.setItem(flagKey, 'pending');
    } catch {
      return;
    }
    this.migrating.add(ownerDid);
    try {
      const local = await this.local.listCanvases(ownerDid);
      const remote = new Set(remoteIds);
      const thumbnails = new Map(local.map((c) => [c.id, c.thumbnail]));
      for (const canvas of local) {
        if (remote.has(canvas.id)) continue;
        const document = await this.local.getDocument(canvas.id);
        await this.client().create({ id: canvas.id, name: canvas.name });
        this.revisions.set(canvas.id, 0);
        if (document) {
          // Without board events, a conflict just means the board already
          // exists remotely — adopt its revision and move on
          await this.saveRemotely(canvas.id, document);
        }
        const thumbnail = thumbnails.get(canvas.id);
        if (thumbnail) {
          await this.client().saveThumbnail({
            canvasId: canvas.id,
            thumbnail,
          });
        }
      }
      localStorage.setItem(flagKey, 'done');
    } catch (error) {
      // Try again next session
      try {
        localStorage.removeItem(flagKey);
      } catch {
        // ignore
      }
      console.warn(
        '[canvas] migrating local boards to the server failed',
        error,
      );
    } finally {
      this.migrating.delete(ownerDid);
    }
  }
}
