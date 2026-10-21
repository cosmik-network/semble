'use client';

import 'tldraw/tldraw.css';
import { useEffect, useState } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import {
  ArrowShapeUtil,
  DefaultFontStyle,
  Editor,
  TLShape,
  Tldraw,
  TldrawOptions,
  TLUiOverrides,
  useValue,
} from 'tldraw';
import { CardShapeUtil } from '../../shapes/cardShape/CardShapeUtil';
import { CollectionShapeUtil } from '../../shapes/collectionShape/CollectionShapeUtil';
import { COLLECTION_DRAG_TYPE } from '../../const';
import {
  CanvasSession,
  CanvasSessionContext,
  useCanvasSession,
} from '../../lib/canvasSession';
import { isConnectionArrowHidden } from '../../lib/arrows';
import { isHiddenByCollapse } from '../../lib/frames';
import { canvasPersistenceKey } from '../../lib/ids';
import { useAddCollectionToCanvas } from '../../lib/useAddCollectionToCanvas';
import CanvasSync from '../../sync/CanvasSync';
import CanvasTopBar from '../canvasTopBar/CanvasTopBar';
import { canvasComponents } from '../canvasUi/canvasComponents';
import CardPanel from '../cardPanel/CardPanel';
import LibraryTray from '../libraryTray/LibraryTray';
import styles from './CanvasEditor.module.css';

// Arrowheads scale with stroke width, so the default small stroke hides direction
const ConnectionArrowShapeUtil = ArrowShapeUtil.configure({
  getCustomDisplayValues: () => ({ strokeWidth: 3, labelFontSize: 13 }),
});

const shapeUtils = [
  CardShapeUtil,
  CollectionShapeUtil,
  ConnectionArrowShapeUtil,
];

export interface CanvasEditorProps {
  userId: string;
  scope: string;
  title: string;
  backHref: string;
}

export default function CanvasEditor(props: CanvasEditorProps) {
  const [session] = useState(() => new CanvasSession(props.userId));
  const [editor, setEditor] = useState<Editor | null>(null);
  const colorScheme = useComputedColorScheme('light');
  const trayOpen = useValue(session.trayOpen);
  const [getShapeVisibility] = useState(
    () => (shape: TLShape, ed: Editor) =>
      isHiddenByCollapse(ed, shape) ||
      isConnectionArrowHidden(ed, shape, session.connectionsHidden.get())
        ? 'hidden'
        : 'inherit',
  );

  const [options] = useState<Partial<TldrawOptions>>(() => ({
    createTextOnCanvasDoubleClick: false,
    experimental__onDropOnCanvas: ({ event, point }) => {
      const raw = event.dataTransfer.getData(COLLECTION_DRAG_TYPE);
      if (!raw) return false;
      session.collectionDrop.set({ collection: JSON.parse(raw), point });
      return true;
    },
  }));
  const [overrides] = useState<TLUiOverrides>(() => ({
    actions: (ed, actions) => ({
      ...actions,
      'semble-find': {
        id: 'semble-find',
        label: 'Find on canvas',
        kbd: 'cmd+f,ctrl+f',
        onSelect: () => {
          session.findOpen.set(true);
        },
      },
      'semble-quick-add': {
        id: 'semble-quick-add',
        label: 'Add a card',
        kbd: '/',
        onSelect: () => {
          const pointer = ed.inputs.getCurrentPagePoint();
          const view = ed.getViewportPageBounds();
          session.quickAdd.set({
            point: view.containsPoint(pointer) ? pointer : view.center,
          });
        },
      },
    }),
  }));

  return (
    <CanvasSessionContext value={session}>
      <CollectionDropHandler editor={editor} />
      <div className={styles.root}>
        <CanvasTopBar
          title={props.title}
          backHref={props.backHref}
          editor={editor}
        />
        <div className={styles.body}>
          {editor && trayOpen && <LibraryTray editor={editor} />}
          <div className={styles.canvas}>
            <Tldraw
              persistenceKey={canvasPersistenceKey(props.userId, props.scope)}
              shapeUtils={shapeUtils}
              components={canvasComponents}
              overrides={overrides}
              options={options}
              getShapeVisibility={getShapeVisibility}
              colorScheme={colorScheme}
              licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
              onMount={(ed) => {
                ed.setStyleForNextShapes(DefaultFontStyle, 'sans');
                setEditor(ed);
              }}
            >
              <CanvasSync />
            </Tldraw>
          </div>
          {editor && <CardPanel editor={editor} />}
        </div>
      </div>
    </CanvasSessionContext>
  );
}

function CollectionDropHandler(props: { editor: Editor | null }) {
  const session = useCanvasSession();
  const drop = useValue(session.collectionDrop);
  const { add } = useAddCollectionToCanvas(props.editor);

  useEffect(() => {
    if (!drop || !props.editor) return;
    session.collectionDrop.set(null);
    add(drop.collection, drop.point);
  }, [drop, props.editor, session, add]);

  return null;
}
