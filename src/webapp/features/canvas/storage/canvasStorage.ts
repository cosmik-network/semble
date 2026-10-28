export interface CanvasRecord {
  id: string;
  name: string;
}

export interface CanvasStorage {
  getCanvas(canvasId: string): Promise<CanvasRecord | null>;
}
