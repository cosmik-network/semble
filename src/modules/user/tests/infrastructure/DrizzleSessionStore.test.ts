import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { NodeSavedSession } from '@atproto/oauth-client-node';
import { DrizzleSessionStore } from '../../infrastructure/services/DrizzleSessionStore';

/**
 * Transient DB failures in this store have outsized consequences upstream:
 * a get() error surfaces as "The session was deleted by another process" and
 * a set() error triggers token revocation at the PDS. The store must retry
 * transient failures, and propagate (not swallow) errors once retries are
 * exhausted.
 */
describe('DrizzleSessionStore retry behavior', () => {
  const session = {
    tokenSet: { sub: 'did:plc:test' },
  } as unknown as NodeSavedSession;
  const row = { key: 'did:plc:test', session: JSON.stringify(session) };

  function dbWithSelect(fn: () => Promise<any[]>): PostgresJsDatabase {
    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: fn,
          }),
        }),
      }),
    } as unknown as PostgresJsDatabase;
  }

  function dbWithTransaction(fn: () => Promise<void>): PostgresJsDatabase {
    return {
      transaction: fn,
    } as unknown as PostgresJsDatabase;
  }

  function failNTimes<T>(n: number, result: T): jest.Mock {
    let calls = 0;
    return jest.fn(async () => {
      calls++;
      if (calls <= n) {
        throw new Error('connection reset');
      }
      return result;
    });
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('get() succeeds after transient failures', async () => {
    const limit = failNTimes(2, [row]);
    const store = new DrizzleSessionStore(dbWithSelect(limit));

    const result = await store.get('did:plc:test');

    expect(result).toEqual(session);
    expect(limit).toHaveBeenCalledTimes(3);
  });

  it('get() propagates the error after retries are exhausted', async () => {
    const limit = failNTimes(10, [row]);
    const store = new DrizzleSessionStore(dbWithSelect(limit));

    await expect(store.get('did:plc:test')).rejects.toThrow('connection reset');
    expect(limit).toHaveBeenCalledTimes(3);
  });

  it('get() returns undefined for a missing session without retrying', async () => {
    const limit = jest.fn(async () => []);
    const store = new DrizzleSessionStore(dbWithSelect(limit));

    const result = await store.get('did:plc:missing');

    expect(result).toBeUndefined();
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it('set() succeeds after transient failures', async () => {
    const transaction = failNTimes(2, undefined);
    const store = new DrizzleSessionStore(dbWithTransaction(transaction));

    await expect(store.set('did:plc:test', session)).resolves.toBeUndefined();
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('set() propagates the error after retries are exhausted', async () => {
    const transaction = failNTimes(10, undefined);
    const store = new DrizzleSessionStore(dbWithTransaction(transaction));

    await expect(store.set('did:plc:test', session)).rejects.toThrow(
      'connection reset',
    );
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('del() succeeds after transient failures', async () => {
    const transaction = failNTimes(1, undefined);
    const store = new DrizzleSessionStore(dbWithTransaction(transaction));

    await expect(store.del('did:plc:test')).resolves.toBeUndefined();
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});
