import type {
  CanvasRecord,
  CanvasStorage,
} from './canvasStorage';

export class MemoryCanvasStorage implements CanvasStorage {
  canvases = new Map<string, CanvasRecord>();

  async getCanvas(canvasId: string) {
    return this.canvases.get(canvasId) ?? null;
  }
}
