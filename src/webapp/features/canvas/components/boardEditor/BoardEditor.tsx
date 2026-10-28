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
import { useEffect, useMemo, useState } from 'react';
import { Editor, Tldraw, type TLComponents, type TLUiOverrides } from 'tldraw';
import { useAuth } from '@/hooks/useAuth';
import {
  attachCanvasController,
  type CanvasLoadStatus,
} from '../../controller/canvasController';
import { isBoardTool } from '../../model/boardTools';
import type { CanvasServer } from '../../server/canvasServer';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import BoardHeader from '../boardHeader/BoardHeader';
import BoardToolbar from '../boardToolbar/BoardToolbar';

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

const server: CanvasServer = {};

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

type Status = 'loading' | CanvasLoadStatus | 'failed';

interface Props {
  canvasId: string;
}

export default function BoardEditor(props: Props) {
  const colorScheme = useComputedColorScheme();
  const { user } = useAuth();
  // Kept once known, so signing out doesn't detach the board and drop edits
  const [ownerDid, setOwnerDid] = useState<string>();
  if (user && !ownerDid) setOwnerDid(user.id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  // The header replaces the main and page menus: a board has one page
  const components = useMemo<TLComponents>(
    () => ({
      MenuPanel: () => <BoardHeader canvasId={props.canvasId} />,
      Toolbar: BoardToolbar,
    }),
    [props.canvasId],
  );

  useEffect(() => {
    if (!editor || !ownerDid) return;
    let active = true;
    const controller = attachCanvasController({
      editor,
      server,
      storage: canvasStorage,
      canvasId: props.canvasId,
      ownerDid,
      onStorageError: showSaveError,
    });
    controller.loaded.then(
      (loaded) => active && setStatus(loaded),
      (error) => {
        console.warn(error);
        if (active) setStatus('failed');
      },
    );
    return () => {
      active = false;
      void controller.detach();
    };
  }, [editor, ownerDid, props.canvasId]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <Tldraw
          components={components}
          overrides={overrides}
          onMount={setEditor}
        />
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
