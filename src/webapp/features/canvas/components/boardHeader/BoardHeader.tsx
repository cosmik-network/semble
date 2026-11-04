'use client';

import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BsPencilFill } from 'react-icons/bs';
import { IoArrowBack } from 'react-icons/io5';
import { useEditor, useValue } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';
import { useNavHistory } from '@/providers/navHistory';
import useCanvas from '../../lib/queries/useCanvas';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';
import RenameCanvasModal from '../renameCanvasModal/RenameCanvasModal';

const RENAME_MENU = 'canvas-rename-modal';

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
  const refreshFailed = useValue(
    'refresh failed',
    () => props.refreshFailed?.get() ?? false,
    [props.refreshFailed],
  );

  const name = canvas?.name ?? DEFAULT_CANVAS_NAME;

  // A board opened from a link has no history to go back to
  const goBack = () => (canGoBack ? router.back() : router.replace('/home'));

  // Open as a tldraw menu, so the board's shortcuts don't act on key presses
  // inside the modal
  useEffect(() => {
    if (!isRenaming) return;
    editor.menus.addOpenMenu(RENAME_MENU);
    return () => editor.menus.deleteOpenMenu(RENAME_MENU);
  }, [editor, isRenaming]);

  return (
    <Paper
      shadow="sm"
      radius="xl"
      p={4}
      pr="xs"
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Group gap="xs" wrap="nowrap">
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
        <Text fw={600} truncate maw={320}>
          {name}
        </Text>
        {/* Renaming before the name loads would start from the default */}
        {canvas && (
          <ActionIcon
            onClick={() => setIsRenaming(true)}
            variant="subtle"
            size="md"
            color="gray"
            radius="xl"
            aria-label="Rename canvas"
          >
            <BsPencilFill size={12} />
          </ActionIcon>
        )}
        {refreshFailed && (
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            Couldn&apos;t refresh
          </Text>
        )}
      </Group>
      {canvas && (
        // Keyed so the form starts from a name changed elsewhere
        <RenameCanvasModal
          key={canvas.name}
          isOpen={isRenaming}
          onClose={() => setIsRenaming(false)}
          canvasId={props.canvasId}
          name={canvas.name}
        />
      )}
    </Paper>
  );
}
