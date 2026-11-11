// Where canvas documents and thumbnails live: Tigris in production, MinIO or
// the filesystem in development. Documents are opaque JSON blobs; the
// repository names the keys, the store only moves bytes.
export interface ICanvasObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  // Null when the key was never written
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  // Removes every key under a prefix, for deleting a board's objects
  deletePrefix(prefix: string): Promise<void>;
}
