import './domShims';
import { IDBFactory } from 'fake-indexeddb';
import {
  Editor,
  createTLStore,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  type TLPointerEventInfo,
} from 'tldraw';
import {
  attachCanvasController,
  type CanvasLoadStatus,
} from '@/features/canvas/controller/canvasController';
import { TLDRAW_VERSION } from '@/features/canvas/storage/browserCanvasStorage';
import { IndexedDbCanvasStorage } from '@/features/canvas/storage/indexedDbCanvasStorage';
import { FakeServer } from './fakeServer';

export interface TestBoard {
  editor: Editor;
  server: FakeServer;
  storage: IndexedDbCanvasStorage;
  canvasId: string;
  status: CanvasLoadStatus;
  // Drags with the current tool, in page coordinates at the default camera
  drag(from: [number, number], to: [number, number]): void;
  // Closes the board, saving it like navigating away would
  dispose(): Promise<void>;
}

interface Options {
  // Pass a previous board's storage and id to reopen it
  storage?: IndexedDbCanvasStorage;
  canvasId?: string;
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
export async function createTestBoard(
  options: Options = {},
): Promise<TestBoard> {
  const shapeUtils = [...defaultShapeUtils];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    store: createTLStore({ shapeUtils, bindingUtils }),
    shapeUtils,
    bindingUtils,
    tools: [...defaultTools, ...defaultShapeTools],
    getContainer: () => document.body,
  });
  // A headless editor can't draw an export, so this stands in for one
  editor.toImage = async () => ({
    blob: new Blob(['board'], { type: 'image/jpeg' }),
    width: 1,
    height: 1,
  });
  const server = new FakeServer();
  const storage =
    options.storage ??
    new IndexedDbCanvasStorage({
      indexedDB: new IDBFactory(),
      tldrawVersion: TLDRAW_VERSION,
    });
  const canvasId = options.canvasId ?? crypto.randomUUID();
  const controller = attachCanvasController({
    editor,
    server,
    storage,
    canvasId,
    ownerDid: 'did:plc:tester',
    onStorageError: (error) => {
      throw error;
    },
  });
  const status = await controller.loaded;

  let disposed = false;
  return {
    editor,
    server,
    storage,
    canvasId,
    status,
    drag(from, to) {
      editor
        .dispatch(pointer('pointer_down', from))
        .dispatch(pointer('pointer_move', to))
        .dispatch(pointer('pointer_up', to));
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await controller.detach();
      editor.dispose();
    },
  };
}
