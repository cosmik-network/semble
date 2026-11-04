import { Button, Group, Modal, Text } from '@mantine/core';
import { useEffect } from 'react';
import { useEditor, useValue } from 'tldraw';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import type { ConnectionEdits } from '../../controller/connectionEdits';

const DELETE_MENU = 'canvas-delete-connection';

interface Props {
  edits: ConnectionEdits;
}

export default function DeleteConnectionModal(props: Props) {
  const editor = useEditor();
  const deleting = useValue(props.edits.deleting);
  const isOpen = !!deleting;
  const count = deleting?.connections.length ?? 0;

  // Open as a tldraw menu, so the board's shortcuts don't act on key presses
  // inside the modal
  useEffect(() => {
    if (!isOpen) return;
    editor.menus.addOpenMenu(DELETE_MENU);
    return () => editor.menus.deleteOpenMenu(DELETE_MENU);
  }, [editor, isOpen]);

  return (
    <Modal
      opened={isOpen}
      onClose={props.edits.cancelDelete}
      withCloseButton={false}
      title={count > 1 ? `Delete ${count} connections` : 'Delete connection'}
      size="xs"
      overlayProps={DANGER_OVERLAY_PROPS}
      centered
    >
      <Text fz="sm" mb="md">
        {count > 1 ? 'They' : 'It'} will be deleted from Semble for good. This
        can&apos;t be undone.
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Button
          variant="light"
          size="md"
          color="gray"
          onClick={props.edits.cancelDelete}
        >
          Cancel
        </Button>
        <Button
          color="red"
          size="md"
          style={{ flex: 1 }}
          onClick={() => void props.edits.confirmDelete()}
          data-autofocus
        >
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
