import type { Editor } from 'tldraw';
import type { CanvasServer } from '../server/canvasServer';
import type { CanvasStorage } from '../storage/canvasStorage';

export interface CanvasControllerDeps {
  editor: Editor;
  server: CanvasServer;
  storage: CanvasStorage;
  canvasId: string;
}

export function attachCanvasController(_deps: CanvasControllerDeps) {
  return function detach() {};
}
