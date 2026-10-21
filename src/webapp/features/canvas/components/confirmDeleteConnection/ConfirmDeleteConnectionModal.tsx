import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEditor, useValue } from 'tldraw';
import { BsExclamation } from 'react-icons/bs';
import useDeleteConnection from '@/features/connections/lib/mutations/useDeleteConnection';
import { getConnectionLabel } from '../../lib/arrows';
import { findNodeShapes } from '../../lib/nodes';
import { useCanvasSession } from '../../lib/canvasSession';
import type { CanvasConnection } from '../../types';

export default function ConfirmDeleteConnectionModal() {
  const editor = useEditor();
  const session = useCanvasSession();
  const deleteConnection = useDeleteConnection();
  const pending = useValue(session.pendingDeletes);

  const titleOf = (url: string) => {
    const shape = findNodeShapes(editor, url)[0];
    if (!shape) return url;
    return (
      ('title' in shape.props ? shape.props.title : shape.props.name) || url
    );
  };

  // Clearing the queue lets reconciliation redraw the kept arrows
  const keep = () => {
    session.pendingDeletes.set([]);
    editor.focus();
  };

  const confirm = () => {
    const connections = pending;
    connections.forEach((c) => session.markDeleted(c.id));
    session.pendingDeletes.set([]);
    editor.focus();

    connections.forEach((c: CanvasConnection) =>
      deleteConnection.mutateAsync({ connectionId: c.id }).catch(() => {
        session.unmarkDeleted(c.id);
        notifications.show({
          message: 'Could not delete connection.',
          color: 'red',
          position: 'top-center',
          icon: <BsExclamation />,
        });
      }),
    );
  };

  return (
    <Modal
      opened={pending.length > 0}
      onClose={keep}
      title={
        pending.length > 1
          ? `Delete ${pending.length} connections?`
          : 'Delete connection?'
      }
      centered
      zIndex={1000}
    >
      <Stack gap="md">
        <Stack gap={4}>
          {pending.map((c) => (
            <Text key={c.id} size="sm" lineClamp={2}>
              <b>{titleOf(c.sourceUrl)}</b>{' '}
              {getConnectionLabel(c.type).toLowerCase()}{' '}
              <b>{titleOf(c.targetUrl)}</b>
            </Text>
          ))}
        </Stack>
        <Text size="xs" c="dimmed">
          This removes the connection from Semble, not just the canvas.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" onClick={keep}>
            Keep
          </Button>
          <Button color="red" onClick={confirm}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
