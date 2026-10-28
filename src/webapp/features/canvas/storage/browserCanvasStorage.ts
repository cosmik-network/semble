import { IndexedDbCanvasStorage } from './indexedDbCanvasStorage';

// tldraw doesn't export its version; a test keeps this in step with the pin
export const TLDRAW_VERSION = '3.15.6';

// Shared by the board and the canvas lists, so each hears the other's changes
export const canvasStorage = new IndexedDbCanvasStorage({
  tldrawVersion: TLDRAW_VERSION,
});
