import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { DrizzleCanvasRepository } from '../../infrastructure/repositories/DrizzleCanvasRepository';
import { FileCanvasObjectStore } from '../../infrastructure/storage/FileCanvasObjectStore';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { canvases } from '../../infrastructure/repositories/schema/canvas.sql';

const document = (seed: string) =>
  Buffer.from(
    JSON.stringify({
      schema: { schemaVersion: 2, sequences: { comp: 1 } },
      store: { shape: seed },
    }),
  );

describe('DrizzleCanvasRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let repository: DrizzleCanvasRepository;
  let storageDir: string;

  const alice = 'did:plc:alice';
  const bob = 'did:plc:bob';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const connectionString = container.getConnectionUri();
    const client = postgres(connectionString);
    db = drizzle(client);
    storageDir = mkdtempSync(path.join(tmpdir(), 'canvas-objects-'));
    repository = new DrizzleCanvasRepository(
      db,
      new FileCanvasObjectStore(storageDir),
    );
    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
    rmSync(storageDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await db.delete(canvases);
  });

  it('creates with a generated id and lists most recently updated first', async () => {
    const first = await repository.create(alice);
    const second = await repository.create(alice);
    expect(second.id).not.toBe(first.id);
    expect(first.name).toBe('Untitled canvas');

    await repository.rename(alice, first.id, 'Old name');
    const listed = await repository.list(alice);
    // Renaming bumped first's updatedAt, so it leads the list
    expect(listed.map((canvas) => canvas.id)).toEqual([first.id, second.id]);
  });

  it('keeps other owners out', async () => {
    const mine = await repository.create(alice);
    expect(await repository.get(bob, mine.id)).toBeNull();
    expect(await repository.rename(bob, mine.id, 'Nope')).toBeNull();
    expect(await repository.duplicate(bob, mine.id)).toBeNull();
    expect(await repository.delete(bob, mine.id)).toBe(false);
  });

  it('saves and opens documents, bumping the revision', async () => {
    const canvas = await repository.create(alice);
    expect((await repository.open(alice, canvas.id))?.document).toBeNull();

    const saved = await repository.save(alice, canvas.id, 0, document('a'), {
      tldrawVersion: '3.15.6',
      linkCount: 2,
      schemaSequences: { comp: 1 },
    });
    expect(saved).toMatchObject({ conflict: false, revision: 1 });

    const opened = await repository.open(alice, canvas.id);
    expect(opened?.document?.toString('utf8')).toContain('"shape":"a"');
    const record = await repository.get(alice, canvas.id);
    expect(record).toMatchObject({
      linkCount: 2,
      tldrawVersion: '3.15.6',
      revision: 1,
      hasThumbnail: false,
    });
  });

  it('rejects a save based on a stale revision', async () => {
    const canvas = await repository.create(alice);
    await repository.save(alice, canvas.id, 0, document('a'), {
      tldrawVersion: '3.15.6',
      linkCount: 0,
      schemaSequences: {},
    });
    // A second writer still on revision 0
    const stale = await repository.save(alice, canvas.id, 0, document('b'), {
      tldrawVersion: '3.15.6',
      linkCount: 0,
      schemaSequences: {},
    });
    expect(stale).toEqual({ conflict: true, currentRevision: 1 });
    // The loser's document is not the one the revision points at
    expect(
      (await repository.open(alice, canvas.id))?.document?.toString(),
    ).toContain('"shape":"a"');
  });

  it('keeps only the latest document after repeated saves', async () => {
    const canvas = await repository.create(alice);
    await repository.save(alice, canvas.id, 0, document('a'), {
      tldrawVersion: '3.15.6',
      linkCount: 0,
      schemaSequences: {},
    });
    await repository.save(alice, canvas.id, 1, document('b'), {
      tldrawVersion: '3.15.6',
      linkCount: 0,
      schemaSequences: {},
    });

    // The revision-0 object is deleted, not left to accumulate per save
    const files = readdirSync(
      path.join(storageDir, 'canvases', canvas.id, 'documents'),
    );
    expect(files).toHaveLength(1);
    expect(
      (await repository.open(alice, canvas.id))?.document?.toString(),
    ).toContain('"shape":"b"');
  });

  it('duplicates the document and thumbnail under a fresh id', async () => {
    const canvas = await repository.create(alice);
    await repository.save(alice, canvas.id, 0, document('a'), {
      tldrawVersion: '3.15.6',
      linkCount: 3,
      schemaSequences: {},
    });
    await repository.saveThumbnail(canvas.id, Buffer.from('jpeg-bytes'));

    const copy = await repository.duplicate(alice, canvas.id);
    if (!copy) throw new Error('Duplicate returned null');
    expect(copy.id).not.toBe(canvas.id);
    expect(copy.name).toBe('Copy of Untitled canvas');
    expect(copy.revision).toBe(0);
    const opened = await repository.open(alice, copy.id);
    expect(opened?.document?.toString('utf8')).toContain('"shape":"a"');
    expect(
      await repository.getThumbnail(copy.id)?.then((b) => b?.toString()),
    ).toBe('jpeg-bytes');
  });

  it('deletes the record and its objects', async () => {
    const canvas = await repository.create(alice);
    await repository.save(alice, canvas.id, 0, document('a'), {
      tldrawVersion: '3.15.6',
      linkCount: 0,
      schemaSequences: {},
    });
    await repository.saveThumbnail(canvas.id, Buffer.from('jpeg-bytes'));

    expect(await repository.delete(alice, canvas.id)).toBe(true);
    expect(await repository.get(alice, canvas.id)).toBeNull();
    expect(await repository.getThumbnail(canvas.id)).toBeNull();
  });

  it('creates with a client-supplied id idempotently', async () => {
    const id = randomUUID();
    const first = await repository.create(alice, id);
    const again = await repository.create(alice, id);
    expect(again.id).toBe(first.id);
    // The same id under another owner is not the same board
    await expect(repository.create(bob, id)).rejects.toThrow();
  });
});
