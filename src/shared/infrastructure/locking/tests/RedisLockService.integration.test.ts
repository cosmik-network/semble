import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { RedisLockService } from '../RedisLockService';

describe('RedisLockService Integration', () => {
  let redisContainer: StartedRedisContainer;
  let redis: Redis;
  let lockService: RedisLockService;

  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new RedisContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Create Redis connection
    const connectionUrl = redisContainer.getConnectionUrl();
    redis = new Redis(connectionUrl, { maxRetriesPerRequest: null });

    // Create lock service
    lockService = new RedisLockService(redis);
  }, 60000); // Increase timeout for container startup

  afterAll(async () => {
    // Clean up
    if (redis) {
      await redis.quit();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    // Clear Redis data between tests
    await redis.flushall();
  });

  describe('Basic Lock Operations', () => {
    it('should acquire and release a lock successfully', async () => {
      // Arrange
      const lockKey = 'test-lock-key';
      let executionCount = 0;
      const testFunction = async () => {
        executionCount++;
        return 'success';
      };

      // Act
      const requestLock = lockService.createRequestLock();
      const result = await requestLock(lockKey, testFunction);

      // Assert
      expect(result).toBe('success');
      expect(executionCount).toBe(1);

      // Verify lock was released by checking Redis directly
      const lockPattern = `oauth:lock:${lockKey}`;
      const keys = await redis.keys(lockPattern);
      expect(keys).toHaveLength(0);
    });

    it('should prevent concurrent execution of the same lock key', async () => {
      // Arrange
      const lockKey = 'concurrent-test-lock';
      let executionOrder: number[] = [];
      let currentExecution = 0;

      const createTestFunction = (id: number) => async () => {
        const executionId = ++currentExecution;
        executionOrder.push(id);

        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 100));

        return `result-${id}-${executionId}`;
      };

      // Act - Start two concurrent operations with same lock key
      const requestLock = lockService.createRequestLock();
      const [result1, result2] = await Promise.all([
        requestLock(lockKey, createTestFunction(1)),
        requestLock(lockKey, createTestFunction(2)),
      ]);

      // Assert - Both should succeed but execute sequentially
      expect(result1).toMatch(/^result-1-\d+$/);
      expect(result2).toMatch(/^result-2-\d+$/);
      expect(executionOrder).toHaveLength(2);

      // Verify they executed sequentially (not concurrently)
      expect(currentExecution).toBe(2);
    });

    it('should allow concurrent execution with different lock keys', async () => {
      // Arrange
      const lockKey1 = 'lock-key-1';
      const lockKey2 = 'lock-key-2';
      let startTimes: number[] = [];

      const createTestFunction = (id: number) => async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 200));
        return `result-${id}`;
      };

      // Act - Start concurrent operations with different lock keys
      const requestLock = lockService.createRequestLock();
      const startTime = Date.now();
      const [result1, result2] = await Promise.all([
        requestLock(lockKey1, createTestFunction(1)),
        requestLock(lockKey2, createTestFunction(2)),
      ]);
      const totalTime = Date.now() - startTime;

      // Assert - Both should succeed and execute concurrently
      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(startTimes).toHaveLength(2);

      // Should complete in roughly 200ms (concurrent) rather than 400ms (sequential)
      expect(totalTime).toBeLessThan(350);

      // Start times should be close together (concurrent execution)
      const timeDiff = Math.abs(startTimes[1]! - startTimes[0]!);
      expect(timeDiff).toBeLessThan(50);
    });

    it('should handle function that throws an error', async () => {
      // Arrange
      const lockKey = 'error-test-lock';
      const errorMessage = 'Test error';
      const errorFunction = async () => {
        throw new Error(errorMessage);
      };

      // Act & Assert
      const requestLock = lockService.createRequestLock();
      await expect(requestLock(lockKey, errorFunction)).rejects.toThrow(
        errorMessage,
      );

      // Verify lock was released even after error
      const lockPattern = `oauth:lock:${lockKey}`;
      const keys = await redis.keys(lockPattern);
      expect(keys).toHaveLength(0);
    });

    it('should handle async function that returns a promise', async () => {
      // Arrange
      const lockKey = 'async-test-lock';
      const asyncFunction = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'async-result', timestamp: Date.now() };
      };

      // Act
      const requestLock = lockService.createRequestLock();
      const result = await requestLock(lockKey, asyncFunction);

      // Assert
      expect(result).toHaveProperty('data', 'async-result');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });
  });

  describe('Lock Key Sharing', () => {
    it('should use the same lock key on every instance (no per-instance prefix)', async () => {
      // The OAuth request lock must be shared across all machines/processes:
      // a per-instance key would let two machines refresh the same
      // single-use refresh token concurrently and destroy the session.
      const originalAllocId = process.env.FLY_ALLOC_ID;
      process.env.FLY_ALLOC_ID = 'test-instance-123';

      const lockKey = 'instance-test-lock';
      let lockKeyUsed = '';

      // Mock redlock to capture the actual lock key used
      const originalAcquire = lockService['redlock'].acquire;
      lockService['redlock'].acquire = jest
        .fn()
        .mockImplementation(async (keys: string[]) => {
          lockKeyUsed = keys[0]!;
          return originalAcquire.call(lockService['redlock'], keys, 30000);
        });

      try {
        // Act
        const requestLock = lockService.createRequestLock();
        await requestLock(lockKey, async () => 'test');

        // Assert - key is identical regardless of instance identity
        expect(lockKeyUsed).toBe(`oauth:lock:${lockKey}`);
      } finally {
        // Cleanup
        process.env.FLY_ALLOC_ID = originalAllocId;
        lockService['redlock'].acquire = originalAcquire;
      }
    });
  });

  describe('Lock Timeout and TTL', () => {
    it('should automatically release lock after TTL expires', async () => {
      // Arrange
      const lockKey = 'ttl-test-lock';

      // Manually acquire a lock with short TTL to simulate timeout
      const fullLockKey = `oauth:lock:${lockKey}`;

      // Use redlock directly to set a very short TTL (100ms)
      const shortLock = await lockService['redlock'].acquire(
        [fullLockKey],
        100,
      );

      // Act - Wait for lock to expire
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Try to acquire the same lock - should succeed if previous lock expired
      const requestLock = lockService.createRequestLock();
      const result = await requestLock(
        lockKey,
        async () => 'success-after-timeout',
      );

      // Assert
      expect(result).toBe('success-after-timeout');

      // Cleanup - release the short lock (may already be expired)
      try {
        await lockService['redlock'].release(shortLock);
      } catch {
        // Ignore errors if lock already expired
      }
    });

    it('should hold the lock across a slow critical section and make waiters wait it out', async () => {
      // Token refreshes can take up to 30s (the oauth-client library's
      // internal timeout). The lock TTL must outlive that window, and a
      // concurrent waiter must wait for the holder to finish rather than
      // failing with "unable to achieve a quorum" after ~1s (the old
      // behavior with retryCount: 3).
      const lockKey = 'slow-refresh-lock';
      const holdMs = 12_000; // longer than the old 10s TTL
      const events: string[] = [];

      const requestLock = lockService.createRequestLock();

      const holder = requestLock(lockKey, async () => {
        events.push('holder-start');
        await new Promise((resolve) => setTimeout(resolve, holdMs));
        events.push('holder-end');
        return 'holder-done';
      });

      // Give the holder a head start, then contend
      await new Promise((resolve) => setTimeout(resolve, 100));
      const waiter = requestLock(lockKey, async () => {
        events.push('waiter-start');
        return 'waiter-done';
      });

      const [holderResult, waiterResult] = await Promise.all([holder, waiter]);

      expect(holderResult).toBe('holder-done');
      expect(waiterResult).toBe('waiter-done');
      // The waiter must not have run until the holder finished — if the
      // lock had expired mid-section, waiter-start would precede holder-end.
      expect(events).toEqual(['holder-start', 'holder-end', 'waiter-start']);
    }, 30_000);

    it('should handle high concurrency with retry mechanism', async () => {
      // Arrange
      const lockKey = 'high-concurrency-lock';
      const concurrentOperations = 5;
      let completedOperations = 0;

      const testFunction = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return ++completedOperations;
      };

      // Act - Start multiple concurrent operations
      const requestLock = lockService.createRequestLock();
      const promises = Array.from({ length: concurrentOperations }, () =>
        requestLock(lockKey, testFunction),
      );

      const results = await Promise.all(promises);

      // Assert - All operations should complete successfully
      expect(results).toHaveLength(concurrentOperations);
      expect(completedOperations).toBe(concurrentOperations);

      // Results should be sequential numbers (1, 2, 3, 4, 5)
      const sortedResults = results.sort((a, b) => a - b);
      expect(sortedResults).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection issues gracefully', async () => {
      // Arrange - Create a new Redis connection that we can close
      const testRedis = new Redis(redisContainer.getConnectionUrl(), {
        maxRetriesPerRequest: null,
      });
      const testLockService = new RedisLockService(testRedis);

      // Close the connection to simulate network issues
      await testRedis.quit();

      // Act & Assert - Should throw an error when trying to acquire lock.
      // Note: acquisition now retries for up to ~1 minute before giving up
      // (waiters must be able to wait out a full token refresh), hence the
      // long test timeout.
      const requestLock = testLockService.createRequestLock();
      await expect(
        requestLock('test-key', async () => 'should-not-execute'),
      ).rejects.toThrow();
    }, 90_000);

    it('should release lock even when function execution is interrupted', async () => {
      // Arrange
      const lockKey = 'interrupt-test-lock';
      let lockAcquired = false;

      const interruptedFunction = async () => {
        lockAcquired = true;
        // Simulate an interruption/error after lock is acquired
        throw new Error('Simulated interruption');
      };

      // Act & Assert
      const requestLock = lockService.createRequestLock();
      await expect(requestLock(lockKey, interruptedFunction)).rejects.toThrow(
        'Simulated interruption',
      );

      // Verify lock was acquired initially
      expect(lockAcquired).toBe(true);

      // Verify lock was released after error
      const lockPattern = `oauth:lock:${lockKey}`;
      const keys = await redis.keys(lockPattern);
      expect(keys).toHaveLength(0);

      // Verify we can acquire the same lock again
      const result = await requestLock(lockKey, async () => 'recovered');
      expect(result).toBe('recovered');
    });
  });
});
