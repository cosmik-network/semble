import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Paper,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { stopEventPropagation, useEditor, useValue } from 'tldraw';
import { ConnectionType } from '@semble/types';
import { BsExclamation } from 'react-icons/bs';
import { LuArrowLeftRight, LuChevronDown, LuTrash2 } from 'react-icons/lu';
import {
  CONNECTION_TYPES,
  NON_DIRECTIONAL_CONNECTION_TYPES,
} from '@/features/connections/const/connectionTypes';
import useUpdateConnection from '@/features/connections/lib/mutations/useUpdateConnection';
import { getArrowMeta, getConnectionLabel } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import type { CanvasConnection } from '../../types';
import styles from './ArrowActionBar.module.css';

export default function ArrowActionBar() {
  const editor = useEditor();
  const session = useCanvasSession();
  const updateConnection = useUpdateConnection();

  const selected = useValue(
    'selected server arrow',
    () => {
      if (!editor.isIn('select.idle')) return null;
      const shape = editor.getOnlySelectedShape();
      if (shape?.type !== 'arrow') return null;
      const meta = getArrowMeta(shape);
      if (meta.status !== 'saved' && meta.status !== 'ghost') return null;
      const bounds = editor.getShapePageBounds(shape);
      session.version.get();
      const connection = meta.connectionId && session.get(meta.connectionId);
      if (!bounds || !connection) return null;
      return {
        id: shape.id,
        connection,
        isMine: meta.status === 'saved',
        anchor: editor.pageToViewport({ x: bounds.midX, y: bounds.minY }),
      };
    },
    [editor, session],
  );

  if (!selected) return null;
  const connection = selected.connection;

  const update = async (
    change: Partial<CanvasConnection>,
    request: { connectionType?: ConnectionType; swap?: boolean },
  ) => {
    try {
      await updateConnection.mutateAsync({
        connectionId: connection.id,
        ...request,
      });
      session.putLocal({ ...connection, ...change });
    } catch {
      notifications.show({
        message: 'Could not update connection.',
        color: 'red',
        position: 'top-center',
        icon: <BsExclamation />,
      });
    }
  };

  return (
    <Paper
      className={styles.root}
      style={{ left: selected.anchor.x, top: selected.anchor.y }}
      shadow="md"
      radius="xl"
      p={4}
      withBorder
      onPointerDown={stopEventPropagation}
    >
      {!selected.isMine ? (
        <Text size="sm" c="dimmed" px="sm" py={8}>
          {getConnectionLabel(connection.type)} · added by someone else
        </Text>
      ) : (
        <Group gap={4} wrap="nowrap">
          <Menu withinPortal={false} position="bottom-start">
            <Menu.Target>
              <Button
                size="sm"
                variant="subtle"
                color="gray"
                rightSection={<LuChevronDown />}
                loading={updateConnection.isPending}
              >
                {getConnectionLabel(connection.type)}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {CONNECTION_TYPES.map((t) => (
                <Menu.Item
                  key={t.value}
                  leftSection={<t.icon />}
                  disabled={t.value === connection.type}
                  onClick={() =>
                    update({ type: t.value }, { connectionType: t.value })
                  }
                >
                  {t.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Tooltip label="Flip direction" withinPortal={false}>
            <ActionIcon
              size="lg"
              radius="xl"
              variant="subtle"
              color="gray"
              disabled={NON_DIRECTIONAL_CONNECTION_TYPES.has(connection.type)}
              onClick={() =>
                update(
                  {
                    sourceUrl: connection.targetUrl,
                    targetUrl: connection.sourceUrl,
                  },
                  { swap: true },
                )
              }
            >
              <LuArrowLeftRight />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete connection" withinPortal={false}>
            <ActionIcon
              size="lg"
              radius="xl"
              variant="subtle"
              color="red"
              onClick={() => editor.deleteShape(selected.id)}
            >
              <LuTrash2 />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </Paper>
  );
}
