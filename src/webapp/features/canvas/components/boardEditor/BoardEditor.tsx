'use client';

import 'tldraw/tldraw.css';
import {
  Button,
  Center,
  Loader,
  Stack,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Editor, Tldraw, type TLComponents } from 'tldraw';
import { useAuth } from '@/hooks/useAuth';
import {
  attachCanvasController,
  type CanvasController,
  type CanvasLoadStatus,
} from '../../controller/canvasController';
import { CanvasCopiesProvider } from '../../lib/canvasCopiesContext';
import { CanvasServerProvider } from '../../lib/canvasServerContext';
import { apiCanvasServer } from '../../server/apiCanvasServer';
import { ConnectionArrowShapeUtil } from '../../shapes/connectionArrow/ConnectionArrowShapeUtil';
import { getShapeVisibility } from '../../shapes/connectionArrow/connectionArrows';
import { LinkCardShapeUtil } from '../../shapes/linkCard/LinkCardShapeUtil';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import BoardContextMenu from '../boardContextMenu/BoardContextMenu';
import BoardHeader from '../boardHeader/BoardHeader';
import BoardNavigation from '../boardNavigation/BoardNavigation';
import BoardToolbar from '../boardToolbar/BoardToolbar';
import CardModals, { type CardModal } from '../cardModals/CardModals';
import QuickAdd from '../quickAdd/QuickAdd';
import ReadOnlyBanner from '../readOnlyBanner/ReadOnlyBanner';
import SelectionPopup from '../selectionPopup/SelectionPopup';
import { boardOverrides } from './boardOverrides';

// tldraw's licence requires the "Made with tldraw" watermark to stay visible
// and unaltered: never hide, cover or restyle it. See TLDRAW-LICENSE.md.

// Replaces tldraw's arrow
const shapeUtils = [LinkCardShapeUtil, ConnectionArrowShapeUtil];
const CARD_MODAL_MENU = 'canvas-card-modal';

function showSaveError(error: unknown) {
  console.warn(error);
  const quotaExceeded =
    error instanceof DOMException && error.name === 'QuotaExceededError';
  notifications.show({
    id: 'canvas-save-error',
    title: "Couldn't save this canvas",
    message: quotaExceeded
      ? 'Your browser storage is full. Free up space or recent changes will be lost.'
      : 'Recent changes may be lost. Reload the page to try again.',
    color: 'red',
    autoClose: false,
    withCloseButton: true,
    position: 'top-center',
  });
}

function showFilesRefused() {
  notifications.show({
    id: 'canvas-files-refused',
    title: "Images and files can't go on a canvas",
    message: 'A canvas holds links and notes. Paste or drop a link instead.',
    position: 'top-center',
  });
}

function showTakenOver() {
  notifications.show({
    id: 'canvas-taken-over',
    title: 'Canvas opened in another tab',
    message:
      "This tab is now read-only. Edits from the last moment before the switch weren't saved.",
    autoClose: false,
    withCloseButton: true,
    position: 'top-center',
  });
}

type Status = 'loading' | CanvasLoadStatus | 'failed';

interface Props {
  canvasId: string;
}

export default function BoardEditor(props: Props) {
  const colorScheme = useComputedColorScheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Kept once known, so signing out doesn't detach the board and drop edits
  const [ownerDid, setOwnerDid] = useState<string>();
  if (user && !ownerDid) setOwnerDid(user.id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [controller, setController] = useState<CanvasController | null>(null);
  const [cardModal, setCardModal] = useState<CardModal | null>(null);
  // The header replaces the main and page menus: a board has one page
  const components = useMemo<TLComponents>(
    () => ({
      MenuPanel: () => (
        <BoardHeader
          canvasId={props.canvasId}
          refreshFailed={controller?.refreshFailed}
        />
      ),
      NavigationPanel: () => (
        <BoardNavigation arrowView={controller?.arrowView ?? null} />
      ),
      Toolbar: BoardToolbar,
      ContextMenu: BoardContextMenu,
      TopPanel: () => (
        <ReadOnlyBanner onTakeOver={async () => controller?.takeOver()} />
      ),
    }),
    [props.canvasId, controller],
  );
  const overrides = useMemo(() => boardOverrides(controller), [controller]);

  const isCardModalOpen = !!cardModal?.kind;

  // Open as a tldraw menu, so the board's shortcuts don't act on key presses
  // inside the modal
  useEffect(() => {
    if (!editor || !isCardModalOpen) return;
    editor.menus.addOpenMenu(CARD_MODAL_MENU);
    return () => editor.menus.deleteOpenMenu(CARD_MODAL_MENU);
  }, [editor, isCardModalOpen]);

  useEffect(() => {
    if (!editor || !ownerDid) return;
    let active = true;
    const attached = attachCanvasController({
      editor,
      server: apiCanvasServer,
      queryClient,
      storage: canvasStorage,
      canvasId: props.canvasId,
      ownerDid,
      onStorageError: showSaveError,
      onTakenOver: showTakenOver,
      onWritingAgain: () => notifications.hide('canvas-taken-over'),
      onNewerVersion: () => active && setStatus('newer-version'),
      onFilesRefused: showFilesRefused,
    });
    attached.loaded.then(
      (loaded) => {
        if (!active) return;
        setStatus(loaded);
        setController(attached);
      },
      (error) => {
        console.warn(error);
        if (active) setStatus('failed');
      },
    );
    return () => {
      active = false;
      setController(null);
      void attached.detach();
    };
  }, [editor, ownerDid, props.canvasId, queryClient]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <CanvasServerProvider server={apiCanvasServer}>
          <CanvasCopiesProvider copies={controller?.copies ?? null}>
            <Tldraw
              shapeUtils={shapeUtils}
              getShapeVisibility={getShapeVisibility}
              components={components}
              overrides={overrides}
              onMount={setEditor}
            >
              {controller && (
                <SelectionPopup
                  popupLink={controller.popupLink}
                  onOpen={(kind, url) => setCardModal({ kind, url })}
                />
              )}
            </Tldraw>
            {controller && <QuickAdd quickAdd={controller.quickAdd} />}
            {controller && (
              <CardModals
                modal={cardModal}
                onClose={() =>
                  setCardModal((modal) => modal && { ...modal, kind: null })
                }
              />
            )}
          </CanvasCopiesProvider>
        </CanvasServerProvider>
      </div>
      {status !== 'ready' && (
        <Center pos="absolute" inset={0} bg="var(--mantine-color-body)">
          <BoardStatus status={status} />
        </Center>
      )}
    </div>
  );
}

function BoardStatus(props: { status: Exclude<Status, 'ready'> }) {
  if (props.status === 'loading') return <Loader />;

  return (
    <Stack align="center" gap="sm">
      <Text fw={500}>
        {props.status === 'newer-version'
          ? 'This canvas was saved by a newer version of Semble.'
          : "Couldn't open this canvas."}
      </Text>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </Stack>
  );
}
