import { IndexedDbCanvasStorage } from './indexedDbCanvasStorage';
import { SyncedCanvasStorage } from './syncedCanvasStorage';
import { createSembleClient } from '@/services/client.apiClient';

// tldraw doesn't export its version; a test keeps this in step with the pin
export const TLDRAW_VERSION = '3.15.6';

// The local half: IndexedDB boards, tab arbitration, sessions, known links.
// Shared by the board and the canvas lists, so each hears the other's changes.
const localCanvasStorage = new IndexedDbCanvasStorage({
  tldrawVersion: TLDRAW_VERSION,
});

// What the feature uses: the same boards, saved to the server on top of the
// local copy. Signed out, it degrades to local-only storage.
export const canvasStorage = new SyncedCanvasStorage(localCanvasStorage, {
  tldrawVersion: TLDRAW_VERSION,
  createClient: () => createSembleClient().canvas,
});
