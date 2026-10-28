// Web Locks, which jsdom lacks. Supports the request modes the canvas uses:
// ifAvailable, steal, and waiting in line with an abort signal. Like the real
// thing, a lock is free again by the time its request settles.
export class FakeLocks {
  private held = new Map<string, (error: DOMException) => void>();
  private queues = new Map<string, (() => void)[]>();
  private heldBackAborts: (() => void)[] = [];
  // Browsers tell a tab it lost its lock after a delay, as it may live in
  // another process. When set, that news waits for deliverAborts().
  holdBackAborts = false;

  deliverAborts() {
    this.heldBackAborts.splice(0).forEach((deliver) => deliver());
  }

  async request<T>(
    name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => Promise<T>,
  ): Promise<T> {
    // Grants arrive asynchronously in browsers too
    await Promise.resolve();
    const holder = this.held.get(name);
    if (holder) {
      if (options.ifAvailable) return callback(null);
      if (options.steal) {
        const deliver = () =>
          holder(
            new DOMException('Lock broken by another request', 'AbortError'),
          );
        if (this.holdBackAborts) this.heldBackAborts.push(deliver);
        else deliver();
      } else {
        await this.waitInLine(name, options.signal);
      }
    }
    return this.grant(name, callback);
  }

  private waitInLine(name: string, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const queue = this.queues.get(name) ?? [];
      this.queues.set(name, queue);
      const turn = () => {
        signal?.removeEventListener('abort', abort);
        resolve();
      };
      const abort = () => {
        queue.splice(queue.indexOf(turn), 1);
        reject(signal!.reason);
      };
      if (signal?.aborted) return reject(signal.reason);
      signal?.addEventListener('abort', abort);
      queue.push(turn);
    });
  }

  private grant<T>(
    name: string,
    callback: (lock: Lock | null) => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const free = () => {
        if (this.held.get(name) !== abort) return;
        this.held.delete(name);
        this.queues.get(name)?.shift()?.();
      };
      // By the time this runs the stealer holds the lock, so it stays held
      const abort = (error: DOMException) => reject(error);
      this.held.set(name, abort);
      callback({ name, mode: 'exclusive' }).then(
        (value) => {
          free();
          resolve(value);
        },
        (error) => {
          free();
          reject(error);
        },
      );
    });
  }
}
