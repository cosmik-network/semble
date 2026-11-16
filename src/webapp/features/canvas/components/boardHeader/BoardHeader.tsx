'use client';

import { ActionIcon, Button, Group, Paper, Text, Tooltip } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { BsPencilFill } from 'react-icons/bs';
import { useEditor, useValue } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';
import { useNavHistory } from '@/providers/navHistory';
import useCanvas from '../../lib/queries/useCanvas';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';
import DeleteCanvasModal from '../deleteCanvasModal/DeleteCanvasModal';
import RenameCanvasModal from '../renameCanvasModal/RenameCanvasModal';
import ShareCanvasModal from '../shareCanvasModal/ShareCanvasModal';

const MODAL_MENU = 'canvas-header-modal';
const PADDING = 4;
// The 8px control radius plus padding and border, so corners stay concentric
const RADIUS = 8 + PADDING + 1;

function Surface(props: { children: ReactNode }) {
  return (
    <Paper
      withBorder
      shadow="sm"
      radius={RADIUS}
      p={PADDING}
      miw={0}
      style={{ pointerEvents: 'all' }}
    >
      <Group gap={6} wrap="nowrap">
        {props.children}
      </Group>
    </Paper>
  );
}

interface Props {
  canvasId: string;
  refreshFailed?: CanvasController['refreshFailed'];
}

export default function BoardHeader(props: Props) {
  const { canGoBack } = useNavHistory();
  const router = useRouter();
  const editor = useEditor();
  const { data: canvas } = useCanvas(props.canvasId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const modalOpen = isRenaming || isDeleting || isSharing;
  const refreshFailed = useValue(
    'refresh failed',
    () => props.refreshFailed?.get() ?? false,
    [props.refreshFailed],
  );

  const name = canvas?.name ?? DEFAULT_CANVAS_NAME;
  const shared = !!canvas?.sharedAt;

  // A board opened from a link has no history to go back to
  const goBack = () => (canGoBack ? router.back() : router.replace('/home'));

  // Open as a tldraw menu, so the board's shortcuts don't act on key presses
  // inside the modals
  useEffect(() => {
    if (!modalOpen) return;
    editor.menus.addOpenMenu(MODAL_MENU);
    return () => editor.menus.deleteOpenMenu(MODAL_MENU);
  }, [editor, modalOpen]);

  return (
    <>
      <Group
        gap={6}
        wrap="nowrap"
        m="xs"
        maw="calc(100vw - 2 * var(--mantine-spacing-xs))"
      >
        <Surface>
          <Tooltip label="Go back" withArrow withinPortal={false}>
            <ActionIcon
              onClick={goBack}
              variant="subtle"
              size="lg"
              color="gray"
              aria-label="Go back"
            >
              <IoArrowBack />
            </ActionIcon>
          </Tooltip>
          <Text fw={700} truncate maw={320} miw={0} px={2} title={name}>
            {name}
          </Text>
          {/* Renaming before the name loads would start from the default */}
          {canvas && (
            <Tooltip label="Rename" withArrow withinPortal={false}>
              <ActionIcon
                onClick={() => setIsRenaming(true)}
                variant="subtle"
                size="lg"
                color="gray"
                aria-label="Rename canvas"
              >
                <BsPencilFill size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {refreshFailed && (
            <Text size="xs" c="dimmed" pr={6} style={{ whiteSpace: 'nowrap' }}>
              Couldn&apos;t refresh
            </Text>
          )}
        </Surface>
        {canvas && (
          <Surface>
            <Tooltip
              label="Shared · manage link"
              withArrow
              withinPortal={false}
              disabled={!shared}
            >
              <Button
                onClick={() => setIsSharing(true)}
                variant={shared ? 'light' : 'subtle'}
                color={shared ? 'blue' : 'gray'}
                radius="md"
                h={34}
                px={10}
                leftSection={<MdOutlinePeopleAlt size={18} />}
                aria-label={shared ? 'Share, currently shared' : undefined}
              >
                Share
              </Button>
            </Tooltip>
          </Surface>
        )}
      </Group>
      {canvas && (
        <>
          {/* Keyed so the form starts from a name changed elsewhere */}
          <RenameCanvasModal
            key={canvas.name}
            isOpen={isRenaming}
            onClose={() => setIsRenaming(false)}
            canvasId={props.canvasId}
            name={canvas.name}
            onDelete={() => {
              setIsRenaming(false);
              setIsDeleting(true);
            }}
          />
          <DeleteCanvasModal
            isOpen={isDeleting}
            onClose={() => setIsDeleting(false)}
            canvasId={props.canvasId}
            name={canvas.name}
            onDeleted={() => router.replace('/canvas')}
          />
          <ShareCanvasModal
            key={String(canvas.sharedAt)}
            isOpen={isSharing}
            onClose={() => setIsSharing(false)}
            canvas={canvas}
          />
        </>
      )}
    </>
  );
}
