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
import { FakeLocks } from './fakeLocks';
import { FakeServer } from './fakeServer';

export interface TestBoard {
  editor: Editor;
  server: FakeServer;
  storage: IndexedDbCanvasStorage;
  canvasId: string;
  // Turns to newer-version when a newer app's save stops this tab writing
  status: CanvasLoadStatus;
  // How many times another tab has taken the board over from this one
  timesTakenOver: number;
  // Opens the same board in another tab, which shares the browser's
  // database and locks but nothing else
  openInAnotherTab(): Promise<TestBoard>;
  // Storage for another tab with no board open, to act as some other app
  storageInAnotherTab(): IndexedDbCanvasStorage;
  // Makes this tab the board's writer when another tab holds it
  takeOver(): Promise<void>;
  // Drags with the current tool, in page coordinates at the default camera
  drag(from: [number, number], to: [number, number]): void;
  // Closes the board, saving it like navigating away would
  dispose(): Promise<void>;
}

interface Options {
  // Pass a previous board's storage and id to reopen it in the same tab
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

interface Browser {
  indexedDB: IDBFactory;
  locks: FakeLocks;
}

const browsers = new WeakMap<IndexedDbCanvasStorage, Browser>();

function openTab(indexedDB: IDBFactory, locks: FakeLocks) {
  const storage = new IndexedDbCanvasStorage({
    indexedDB,
    locks,
    tldrawVersion: TLDRAW_VERSION,
  });
  browsers.set(storage, { indexedDB, locks });
  return storage;
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
  const storage = options.storage ?? openTab(new IDBFactory(), new FakeLocks());
  const canvasId = options.canvasId ?? crypto.randomUUID();
  const storageInAnotherTab = () => {
    const browser = browsers.get(storage)!;
    return openTab(browser.indexedDB, browser.locks);
  };
  let disposed = false;
  // Filled in below; the controller's callbacks only run once it has loaded
  const board = {} as TestBoard;
  const controller = attachCanvasController({
    editor,
    server,
    storage,
    canvasId,
    ownerDid: 'did:plc:tester',
    onStorageError: (error) => {
      throw error;
    },
    onTakenOver: () => board.timesTakenOver++,
    onWritingAgain: () => {},
    onNewerVersion: () => (board.status = 'newer-version'),
  });

  return Object.assign(board, {
    editor,
    server,
    storage,
    canvasId,
    status: await controller.loaded,
    timesTakenOver: 0,
    openInAnotherTab: () =>
      createTestBoard({ storage: storageInAnotherTab(), canvasId }),
    storageInAnotherTab,
    takeOver: () => controller.takeOver(),
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
  } satisfies TestBoard);
}
