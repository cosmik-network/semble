'use client';

import { ActionIcon, Group, Paper, Text, Tooltip } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { LuPencil } from 'react-icons/lu';
import { useEditor, useValue } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';
import { useNavHistory } from '@/providers/navHistory';
import useCanvas from '../../lib/queries/useCanvas';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';
import DeleteCanvasModal from '../deleteCanvasModal/DeleteCanvasModal';
import RenameCanvasModal from '../renameCanvasModal/RenameCanvasModal';

const MODAL_MENU = 'canvas-header-modal';

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
  const modalOpen = isRenaming || isDeleting;
  const refreshFailed = useValue(
    'refresh failed',
    () => props.refreshFailed?.get() ?? false,
    [props.refreshFailed],
  );

  const name = canvas?.name ?? DEFAULT_CANVAS_NAME;

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
    <Paper
      withBorder
      shadow="sm"
      radius="xl"
      p={4}
      pr="xs"
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Go back" withArrow withinPortal={false}>
          <ActionIcon
            onClick={goBack}
            variant="subtle"
            size="lg"
            color="gray"
            radius="xl"
            aria-label="Go back"
          >
            <IoArrowBack />
          </ActionIcon>
        </Tooltip>
        <Text fw={700} truncate maw={320}>
          {name}
        </Text>
        {/* Renaming before the name loads would start from the default */}
        {canvas && (
          <Tooltip label="Rename" withArrow withinPortal={false}>
            <ActionIcon
              onClick={() => setIsRenaming(true)}
              variant="subtle"
              size="md"
              color="gray"
              radius="xl"
              aria-label="Rename canvas"
            >
              <LuPencil size={14} />
            </ActionIcon>
          </Tooltip>
        )}
        {refreshFailed && (
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            Couldn&apos;t refresh
          </Text>
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
        </>
      )}
    </Paper>
  );
}
