import type { CanvasServer } from '@/features/canvas/server/canvasServer';

export interface ServerCall {
  method: string;
  args: unknown[];
}

export class FakeServer implements CanvasServer {
  calls: ServerCall[] = [];
}
