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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Editor, Tldraw, type TLComponents, type TLUiOverrides } from 'tldraw';
import { useAuth } from '@/hooks/useAuth';
import {
  attachCanvasController,
  type CanvasController,
  type CanvasLoadStatus,
} from '../../controller/canvasController';
import { isBoardTool } from '../../model/boardTools';
import { CanvasServerProvider } from '../../lib/canvasServerContext';
import { apiCanvasServer } from '../../server/apiCanvasServer';
import { LinkCardShapeUtil } from '../../shapes/linkCard/LinkCardShapeUtil';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import BoardHeader from '../boardHeader/BoardHeader';
import BoardToolbar from '../boardToolbar/BoardToolbar';
import ReadOnlyBanner from '../readOnlyBanner/ReadOnlyBanner';

// tldraw's licence requires the "Made with tldraw" watermark to stay visible
// and unaltered: never hide, cover or restyle it. See TLDRAW-LICENSE.md.

// Removing tools here also removes their keyboard shortcuts
const overrides: TLUiOverrides = {
  tools(_editor, tools) {
    for (const id of Object.keys(tools)) {
      if (!isBoardTool(id)) delete tools[id];
    }
    return tools;
  },
  // No asset store, so the insert menu items go
  actions(_editor, actions) {
    delete actions['insert-media'];
    delete actions['insert-embed'];
    return actions;
  },
};

const shapeUtils = [LinkCardShapeUtil];

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
  const controllerRef = useRef<CanvasController | null>(null);
  // The header replaces the main and page menus: a board has one page
  const components = useMemo<TLComponents>(
    () => ({
      MenuPanel: () => <BoardHeader canvasId={props.canvasId} />,
      Toolbar: BoardToolbar,
      TopPanel: () => (
        <ReadOnlyBanner
          onTakeOver={async () => controllerRef.current?.takeOver()}
        />
      ),
    }),
    [props.canvasId],
  );

  useEffect(() => {
    if (!editor || !ownerDid) return;
    let active = true;
    const controller = attachCanvasController({
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
    controllerRef.current = controller;
    controller.loaded.then(
      (loaded) => active && setStatus(loaded),
      (error) => {
        console.warn(error);
        if (active) setStatus('failed');
      },
    );
    return () => {
      active = false;
      controllerRef.current = null;
      void controller.detach();
    };
  }, [editor, ownerDid, props.canvasId, queryClient]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <CanvasServerProvider server={apiCanvasServer}>
          <Tldraw
            shapeUtils={shapeUtils}
            components={components}
            overrides={overrides}
            onMount={setEditor}
          />
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
