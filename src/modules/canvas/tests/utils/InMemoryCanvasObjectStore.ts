import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';

// Bytes in a Map, for tests
export class InMemoryCanvasObjectStore implements ICanvasObjectStore {
  private objects = new Map<string, Buffer>();

  async put(key: string, body: Buffer) {
    this.objects.set(key, body);
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async deletePrefix(prefix: string) {
    for (const key of this.objects.keys()) {
      if (key.startsWith(prefix)) this.objects.delete(key);
    }
  }
}
