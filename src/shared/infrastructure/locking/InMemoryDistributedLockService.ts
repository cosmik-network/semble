import { IDistributedLockService } from './IDistributedLockService';

/**
 * In-memory distributed locking service for development and testing.
 *
 * Provides lock functionality using in-memory state. This is suitable for:
 * - Local development with a single worker
 * - Unit/integration tests
 * - Mock persistence mode
 *
 * NOT suitable for production with multiple workers/instances.
 */
export class InMemoryDistributedLockService implements IDistributedLockService {
  private locks: Map<string, boolean> = new Map();

  async withLock<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    // Simple lock acquisition - throws if already locked
    if (this.locks.get(key)) {
      throw new Error(`Lock already held for key: ${key}`);
    }

    this.locks.set(key, true);

    // Set TTL to auto-release lock (safety mechanism)
    const timeout = setTimeout(() => {
      this.locks.delete(key);
    }, ttl);

    try {
      return await fn();
    } finally {
      clearTimeout(timeout);
      this.locks.delete(key);
    }
  }
}
