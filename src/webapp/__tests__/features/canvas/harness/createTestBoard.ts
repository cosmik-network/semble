import './domShims';
import {
  Editor,
  createTLStore,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  type TLPointerEventInfo,
} from 'tldraw';
import { attachCanvasController } from '@/features/canvas/controller/canvasController';
import { FakeServer } from './fakeServer';
import { MemoryCanvasStorage } from '@/features/canvas/storage/memoryCanvasStorage';

export interface TestBoard {
  editor: Editor;
  server: FakeServer;
  storage: MemoryCanvasStorage;
  // Drags with the current tool, in page coordinates at the default camera
  drag(from: [number, number], to: [number, number]): void;
  dispose(): void;
}

function pointer(
  name: 'pointer_down' | 'pointer_move' | 'pointer_up',
  [x, y]: [number, number],
): TLPointerEventInfo {
  return {
    type: 'pointer',
    name,
    target: 'canvas',
    point: { x, y, z: 0.5 },
    pointerId: 1,
    button: 0,
    isPen: false,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    accelKey: false,
  };
}

// A headless editor with the same shapes, bindings and tools <Tldraw> registers
export function createTestBoard(canvasId = 'test-canvas'): TestBoard {
  const shapeUtils = [...defaultShapeUtils];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    store: createTLStore({ shapeUtils, bindingUtils }),
    shapeUtils,
    bindingUtils,
    tools: [...defaultTools, ...defaultShapeTools],
    getContainer: () => document.body,
  });
  const server = new FakeServer();
  const storage = new MemoryCanvasStorage();
  const detach = attachCanvasController({ editor, server, storage, canvasId });

  return {
    editor,
    server,
    storage,
    drag(from, to) {
      editor
        .dispatch(pointer('pointer_down', from))
        .dispatch(pointer('pointer_move', to))
        .dispatch(pointer('pointer_up', to));
    },
    dispose() {
      detach();
      editor.dispose();
    },
  };
}
