import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleApiKeyRepository } from '../../infrastructure/repositories/DrizzleApiKeyRepository';
import { ApiKeyRecord } from '../../domain/repositories/IApiKeyRepository';
import { apiKeys } from '../../infrastructure/repositories/schema/apiKey.sql';
import { users } from '../../infrastructure/repositories/schema/user.sql';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';

describe('DrizzleApiKeyRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let repository: DrizzleApiKeyRepository;

  const userDid = 'did:plc:apikeyuser';
  const anotherUserDid = 'did:plc:otherapikeyuser';

  function makeRecord(overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
    return {
      id: uuidv4(),
      userDid,
      name: 'Test Key',
      prefix: 'sk_abcd1234',
      tokenHash: `hash-${uuidv4()}`,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: null,
      revoked: false,
      ...overrides,
    };
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    repository = new DrizzleApiKeyRepository(db);

    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(apiKeys);
    await db.delete(users);

    // api_keys.user_did references users.id, so users must exist first.
    await db.insert(users).values([
      {
        id: userDid,
        handle: 'apikeyuser',
        linkedAt: new Date(),
        lastLoginAt: new Date(),
      },
      {
        id: anotherUserDid,
        handle: 'otherapikeyuser',
        linkedAt: new Date(),
        lastLoginAt: new Date(),
      },
    ]);
  });

  it('should save and retrieve an API key', async () => {
    const record = makeRecord({ name: 'My Key' });

    const saveResult = await repository.save(record);
    expect(saveResult.isOk()).toBe(true);

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.isOk()).toBe(true);
    const stored = found.unwrap();
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(record.id);
    expect(stored?.userDid).toBe(userDid);
    expect(stored?.name).toBe('My Key');
    expect(stored?.tokenHash).toBe(record.tokenHash);
    expect(stored?.lastUsedAt).toBeNull();
    expect(stored?.expiresAt).toBeNull();
    expect(stored?.revoked).toBe(false);
  });

  it('should not return a key when queried by a different user', async () => {
    const record = makeRecord();
    await repository.save(record);

    const found = await repository.findByIdForUser(record.id, anotherUserDid);
    expect(found.isOk()).toBe(true);
    expect(found.unwrap()).toBeNull();
  });

  it('should find an active key by token hash', async () => {
    const record = makeRecord();
    await repository.save(record);

    const found = await repository.findByTokenHash(record.tokenHash);
    expect(found.isOk()).toBe(true);
    expect(found.unwrap()?.id).toBe(record.id);
  });

  it('should not find a revoked key by token hash', async () => {
    const record = makeRecord();
    await repository.save(record);
    await repository.revoke(record.id, userDid);

    const found = await repository.findByTokenHash(record.tokenHash);
    expect(found.isOk()).toBe(true);
    expect(found.unwrap()).toBeNull();
  });

  it('should list only the active keys for a user, newest first', async () => {
    const older = makeRecord({
      name: 'Older',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newer = makeRecord({
      name: 'Newer',
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    const revoked = makeRecord({ name: 'Revoked' });
    const otherUsers = makeRecord({
      name: 'Other Users',
      userDid: anotherUserDid,
    });

    await repository.save(older);
    await repository.save(newer);
    await repository.save(revoked);
    await repository.save(otherUsers);
    await repository.revoke(revoked.id, userDid);

    const listed = await repository.listByUser(userDid);
    expect(listed.isOk()).toBe(true);
    const keys = listed.unwrap();
    expect(keys.map((k) => k.name)).toEqual(['Newer', 'Older']);
  });

  it('should update the name of an active key', async () => {
    const record = makeRecord({ name: 'Original' });
    await repository.save(record);

    const updated = await repository.updateName(record.id, userDid, 'Renamed');
    expect(updated.isOk()).toBe(true);
    expect(updated.unwrap()?.name).toBe('Renamed');

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.unwrap()?.name).toBe('Renamed');
  });

  it('should not update the name of another user key', async () => {
    const record = makeRecord();
    await repository.save(record);

    const updated = await repository.updateName(
      record.id,
      anotherUserDid,
      'Hijacked',
    );
    expect(updated.isOk()).toBe(true);
    expect(updated.unwrap()).toBeNull();

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.unwrap()?.name).toBe(record.name);
  });

  it('should not update the name of a revoked key', async () => {
    const record = makeRecord();
    await repository.save(record);
    await repository.revoke(record.id, userDid);

    const updated = await repository.updateName(record.id, userDid, 'Renamed');
    expect(updated.isOk()).toBe(true);
    expect(updated.unwrap()).toBeNull();
  });

  it('should record lastUsedAt when touched', async () => {
    const record = makeRecord();
    await repository.save(record);

    const when = new Date('2026-05-28T12:00:00Z');
    const touched = await repository.touchLastUsed(record.id, when);
    expect(touched.isOk()).toBe(true);

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.unwrap()?.lastUsedAt?.getTime()).toBe(when.getTime());
  });

  it('should revoke an active key and report success', async () => {
    const record = makeRecord();
    await repository.save(record);

    const revoked = await repository.revoke(record.id, userDid);
    expect(revoked.isOk()).toBe(true);
    expect(revoked.unwrap()).toBe(true);

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.unwrap()?.revoked).toBe(true);
  });

  it('should report no change when revoking an already-revoked key', async () => {
    const record = makeRecord();
    await repository.save(record);
    await repository.revoke(record.id, userDid);

    const second = await repository.revoke(record.id, userDid);
    expect(second.isOk()).toBe(true);
    expect(second.unwrap()).toBe(false);
  });

  it('should not revoke another user key', async () => {
    const record = makeRecord();
    await repository.save(record);

    const revoked = await repository.revoke(record.id, anotherUserDid);
    expect(revoked.isOk()).toBe(true);
    expect(revoked.unwrap()).toBe(false);

    const found = await repository.findByIdForUser(record.id, userDid);
    expect(found.unwrap()?.revoked).toBe(false);
  });

  it('should return false when revoking a key that does not exist', async () => {
    const revoked = await repository.revoke(uuidv4(), userDid);
    expect(revoked.isOk()).toBe(true);
    expect(revoked.unwrap()).toBe(false);
  });
});
