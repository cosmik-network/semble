import './domShims';
import { IDBFactory } from 'fake-indexeddb';
import { QueryClient } from '@tanstack/react-query';
import {
  Box,
  Editor,
  createTLStore,
  defaultAddFontsFromNode,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  tipTapDefaultExtensions,
  type TLPointerEventInfo,
  type VecLike,
} from 'tldraw';
import {
  attachCanvasController,
  type CanvasLoadStatus,
} from '@/features/canvas/controller/canvasController';
import { TLDRAW_VERSION } from '@/features/canvas/storage/browserCanvasStorage';
import { IndexedDbCanvasStorage } from '@/features/canvas/storage/indexedDbCanvasStorage';
import {
  LinkCardShapeUtil,
  type LinkCardShape,
} from '@/features/canvas/shapes/linkCard/LinkCardShapeUtil';
import { LINK_CARD_TYPE } from '@/features/canvas/model/linkCards';
import { FakeLocks } from './fakeLocks';
import { FakeServer } from './fakeServer';

export interface TestBoard {
  editor: Editor;
  server: FakeServer;
  // This tab's query cache, which the cards read
  queryClient: QueryClient;
  storage: IndexedDbCanvasStorage;
  canvasId: string;
  // Turns to newer-version when a newer app's save stops this tab writing
  status: CanvasLoadStatus;
  // How many times another tab has taken the board over from this one
  timesTakenOver: number;
  // How many times pasted or dropped files were refused
  timesFilesRefused: number;
  // Opens the same board in another tab, which shares the browser's
  // database and locks but nothing else
  openInAnotherTab(): Promise<TestBoard>;
  // Storage for another tab with no board open, to act as some other app
  storageInAnotherTab(): IndexedDbCanvasStorage;
  // Makes this tab the board's writer when another tab holds it
  takeOver(): Promise<void>;
  // Drags with the current tool, in page coordinates at the default camera
  drag(from: [number, number], to: [number, number]): void;
  // What tldraw's clipboard and drop handling pass on
  pasteUrl(url: string): Promise<void>;
  pasteText(text: string): Promise<void>;
  pasteFiles(files: File[]): Promise<void>;
  dropUrl(url: string, point: VecLike): Promise<void>;
  linkCards(): LinkCardShape[];
  // Closes the board, saving it like navigating away would
  dispose(): Promise<void>;
}

interface Options {
  // Pass a previous board's storage and id to reopen it in the same tab
  storage?: IndexedDbCanvasStorage;
  canvasId?: string;
  server?: FakeServer;
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
  const shapeUtils = [...defaultShapeUtils, LinkCardShapeUtil];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    store: createTLStore({ shapeUtils, bindingUtils }),
    shapeUtils,
    bindingUtils,
    tools: [...defaultTools, ...defaultShapeTools],
    getContainer: () => document.body,
    textOptions: {
      addFontsFromNode: defaultAddFontsFromNode,
      tipTapConfig: { extensions: tipTapDefaultExtensions },
    },
  });
  // jsdom has no layout, so the viewport is given a size
  editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
  // A headless editor can't draw an export, so this stands in for one
  editor.toImage = async () => ({
    blob: new Blob(['board'], { type: 'image/jpeg' }),
    width: 1,
    height: 1,
  });
  const server = options.server ?? new FakeServer();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
    queryClient,
    storage,
    canvasId,
    ownerDid: 'did:plc:tester',
    onStorageError: (error) => {
      throw error;
    },
    onTakenOver: () => board.timesTakenOver++,
    onFilesRefused: () => board.timesFilesRefused++,
    onWritingAgain: () => {},
    onNewerVersion: () => (board.status = 'newer-version'),
  });

  return Object.assign(board, {
    editor,
    server,
    queryClient,
    storage,
    canvasId,
    status: await controller.loaded,
    timesTakenOver: 0,
    timesFilesRefused: 0,
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
    pasteUrl: (url) => editor.putExternalContent({ type: 'url', url }),
    pasteText: (text) => editor.putExternalContent({ type: 'text', text }),
    pasteFiles: (files) => editor.putExternalContent({ type: 'files', files }),
    dropUrl: (url, point) =>
      editor.putExternalContent({ type: 'url', url, point }),
    linkCards: () =>
      editor
        .getCurrentPageShapes()
        .filter(
          (shape): shape is LinkCardShape => shape.type === LINK_CARD_TYPE,
        ),
    async dispose() {
      if (disposed) return;
      disposed = true;
      await controller.detach();
      editor.dispose();
    },
  } satisfies TestBoard);
}
