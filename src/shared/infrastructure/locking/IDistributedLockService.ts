/**
 * Interface for distributed locking service.
 *
 * Provides distributed locking across multiple workers/instances using
 * a shared lock store (Redis in production, in-memory for development).
 */
export interface IDistributedLockService {
  /**
   * Executes a function while holding a distributed lock.
   *
   * @param key - The lock key to acquire
   * @param ttl - Time-to-live for the lock in milliseconds
   * @param fn - The function to execute while holding the lock
   * @returns The result of the function execution
   * @throws Error if lock cannot be acquired after retries
   */
  withLock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>;
}
