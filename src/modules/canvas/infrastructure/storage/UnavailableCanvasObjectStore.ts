import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';

// Stand-in for a missing S3 config in dev/prod. Booting must not crash-loop
// the whole app over one bad secret, but silently falling back to ephemeral
// machine disks would lose canvas documents, so every operation fails with a
// message that names the fix. Only canvas routes are affected.
export class UnavailableCanvasObjectStore implements ICanvasObjectStore {
  private fail(): never {
    throw new Error(
      'Canvas object storage is not configured: set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY, and S3_ENDPOINT (https://fly.storage.tigris.dev on Fly)',
    );
  }

  async put(): Promise<void> {
    this.fail();
  }

  async get(): Promise<Buffer | null> {
    this.fail();
  }

  async delete(): Promise<void> {
    this.fail();
  }

  async deletePrefix(): Promise<void> {
    this.fail();
  }
}
