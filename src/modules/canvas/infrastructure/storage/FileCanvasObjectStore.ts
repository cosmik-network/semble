import { promises as fs } from 'fs';
import * as path from 'path';
import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';

// The store tests and mock-repos runs use: same interface, bytes on disk
// under a scratch directory.
export class FileCanvasObjectStore implements ICanvasObjectStore {
  constructor(private root: string) {}

  private file(key: string) {
    // Keys are ours (canvases/<uuid>/...), but never trust them near a path
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error(`Invalid object key: ${key}`);
    }
    return resolved;
  }

  async put(key: string, body: Buffer, _contentType: string) {
    const file = this.file(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.file(key));
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }

  async deletePrefix(prefix: string) {
    const dir = this.file(prefix);
    await fs.rm(dir, { recursive: true, force: true });
  }
}
