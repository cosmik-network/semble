import { DragEvent, MouseEvent, ReactNode } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import type { Collection } from '@semble/types';
import { Editor, TLShapeId, useValue } from 'tldraw';
import { UrlMetadata } from '@semble/types';
import { LuCheck, LuPlus } from 'react-icons/lu';
import { COLLECTION_DRAG_TYPE, COLLECTION_TYPE } from '../../const';
import { addCardAt, addCardsNear, isOnCanvas } from '../../lib/cardOps';
import { isCollectionShape } from '../../lib/frames';
import { getCardCopies } from '../../lib/nodes';
import { useAddCollectionToCanvas } from '../../lib/useAddCollectionToCanvas';
import styles from './PanelCardItem.module.css';

// Links inside webapp cards open in a new tab so the canvas stays put
const openLinksInNewTab = (e: MouseEvent) => {
  const link = (e.target as Element).closest('a[href]');
  if (!(link instanceof HTMLAnchorElement) || link.target) return;
  e.preventDefault();
  window.open(link.href, '_blank');
};

interface ShellProps {
  children: ReactNode;
  onCanvas: boolean;
  loading?: boolean;
  onAdd: () => void;
  onShow: () => void;
  onDragStart: (e: DragEvent) => void;
}

function Shell(props: ShellProps) {
  const label = props.onCanvas ? 'Show on canvas' : 'Add to canvas';
  return (
    <div
      className={styles.root}
      draggable
      onDragStart={props.onDragStart}
      onClickCapture={openLinksInNewTab}
    >
      {props.children}
      <Tooltip label={label} position="left">
        <ActionIcon
          className={styles.action}
          data-on-canvas={props.onCanvas || undefined}
          variant={props.onCanvas ? 'light' : 'default'}
          color={props.onCanvas ? 'green' : 'gray'}
          radius="xl"
          aria-label={label}
          loading={props.loading}
          onClick={props.onCanvas ? props.onShow : props.onAdd}
        >
          {props.onCanvas ? <LuCheck /> : <LuPlus />}
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

const focusShape = (editor: Editor, id: TLShapeId) => {
  editor.select(id);
  editor.zoomToSelection({ animation: { duration: 300 } });
};

interface UrlItemProps {
  editor: Editor;
  url: string;
  metadata?: Partial<UrlMetadata>;
  note?: string;
  // New cards go beside this card instead of the middle of the view
  anchorId?: TLShapeId;
  side?: 'left' | 'right';
  // Cards placed mid-view glide in from this edge of the canvas
  origin?: 'left';
  children: ReactNode;
}

export function PanelUrlCardItem(props: UrlItemProps) {
  const editor = props.editor;
  const onCanvas = useValue(
    'url on canvas',
    () => isOnCanvas(editor, props.url),
    [editor, props.url],
  );

  return (
    <Shell
      onCanvas={onCanvas}
      onAdd={() => {
        const item = {
          url: props.url,
          metadata: props.metadata,
          note: props.note,
        };
        if (props.anchorId && editor.getShape(props.anchorId)) {
          addCardsNear(editor, props.anchorId, [item], props.side ?? 'right');
        } else {
          const view = editor.getViewportPageBounds();
          addCardAt(
            editor,
            item,
            view.center,
            props.origin && { x: view.minX, y: view.midY },
          );
        }
      }}
      onShow={() => {
        // Each click moves on to the next copy
        const copies = getCardCopies(editor, props.url);
        const current = copies.findIndex((c) =>
          editor.getSelectedShapeIds().includes(c.id),
        );
        const next = copies[(current + 1) % copies.length];
        if (next) focusShape(editor, next.id);
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/uri-list', props.url);
        e.dataTransfer.setData('text/plain', props.url);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {props.children}
    </Shell>
  );
}

interface CollectionItemProps {
  editor: Editor;
  collection: Collection;
  children: ReactNode;
}

export function PanelCollectionItem(props: CollectionItemProps) {
  const editor = props.editor;
  const c = props.collection;
  const { add, loadingId } = useAddCollectionToCanvas(editor);
  const shapeId = useValue(
    'collection on canvas',
    () =>
      editor
        .getCurrentPageShapes()
        .find(
          (s) =>
            s.type === COLLECTION_TYPE &&
            isCollectionShape(s) &&
            s.props.collectionId === c.id,
        )?.id ?? null,
    [editor, c.id],
  );

  return (
    <Shell
      onCanvas={!!shapeId}
      loading={loadingId === c.id}
      onAdd={() => add(c)}
      onShow={() => shapeId && focusShape(editor, shapeId)}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          COLLECTION_DRAG_TYPE,
          JSON.stringify({ id: c.id, cardCount: c.cardCount }),
        );
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {props.children}
    </Shell>
  );
}
