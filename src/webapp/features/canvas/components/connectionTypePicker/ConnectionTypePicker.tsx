import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  stopEventPropagation,
  TLArrowShape,
  useEditor,
  useValue,
} from 'tldraw';
import { ConnectionType } from '@semble/types';
import { BsExclamation } from 'react-icons/bs';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import useCreateConnection from '@/features/connections/lib/mutations/useCreateConnection';
import {
  arrowStyle,
  getArrowEnds,
  serverWrite,
  upsertConnectionArrows,
} from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { resolveNodeUrl } from '../../lib/frames';
import styles from './ConnectionTypePicker.module.css';

export default function ConnectionTypePicker() {
  const editor = useEditor();
  const session = useCanvasSession();
  const createConnection = useCreateConnection();
  const arrowId = useValue(session.pendingArrowId);
  const [type, setType] = useState<ConnectionType>('RELATED');
  const [note, setNote] = useState('');

  const anchor = useValue(
    'connection picker anchor',
    () => {
      if (!arrowId || !getArrowEnds(editor, arrowId)) return null;
      const bounds = editor.getShapePageBounds(arrowId);
      return bounds ? editor.pageToViewport(bounds.center) : null;
    },
    [editor, arrowId],
  );

  // The arrow was undone, deleted or detached from a card
  useEffect(() => {
    if (!arrowId || anchor) return;
    session.pendingArrowId.set(null);
    if (editor.getShape(arrowId)) {
      editor.run(
        () =>
          editor.updateShape<TLArrowShape>({
            id: arrowId,
            type: 'arrow',
            meta: {},
            props: { dash: 'draw' },
          }),
        { history: 'ignore' },
      );
    }
  }, [arrowId, anchor, editor, session]);

  if (!arrowId || !anchor) return null;

  const reset = () => {
    session.pendingArrowId.set(null);
    setType('RELATED');
    setNote('');
    editor.focus();
  };

  const cancel = () => {
    serverWrite(editor, () => editor.deleteShape(arrowId));
    reset();
  };

  const submit = async () => {
    const ends = getArrowEnds(editor, arrowId);
    if (!ends) return;
    const connectionType = type;
    const connectionNote = note.trim() || undefined;
    reset();

    editor.run(
      () =>
        editor.updateShape<TLArrowShape>({
          id: arrowId,
          type: 'arrow',
          meta: { status: 'saving' },
          props: arrowStyle(undefined, 'saving'),
        }),
      { history: 'ignore' },
    );

    try {
      const [sourceUrl, targetUrl] = await Promise.all([
        resolveNodeUrl(editor, ends.source),
        resolveNodeUrl(editor, ends.target),
      ]);
      const res = await createConnection.mutateAsync({
        sourceUrl,
        targetUrl,
        connectionType,
        note: connectionNote,
      });
      if (!res?.connectionId) throw new Error('No connection id returned');

      const connection = {
        id: res.connectionId,
        sourceUrl,
        targetUrl,
        type: connectionType,
        note: connectionNote,
        curatorId: session.userId,
      };
      session.putLocal(connection);
      serverWrite(editor, () => {
        if (editor.getShape(arrowId)) editor.deleteShape(arrowId);
        upsertConnectionArrows(editor, connection, 'saved');
      });
    } catch {
      serverWrite(editor, () => {
        if (editor.getShape(arrowId)) editor.deleteShape(arrowId);
      });
      notifications.show({
        message: 'Could not create connection.',
        color: 'red',
        position: 'top-center',
        icon: <BsExclamation />,
      });
    }
  };

  const selected = CONNECTION_TYPES.find((t) => t.value === type)!;

  return (
    <Paper
      className={styles.root}
      style={{ left: anchor.x, top: anchor.y }}
      shadow="md"
      radius="lg"
      p="sm"
      withBorder
      onPointerDown={stopEventPropagation}
      onWheel={stopEventPropagation}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') cancel();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Connect as
        </Text>
        <SimpleGrid cols={2} spacing={6} verticalSpacing={6}>
          {CONNECTION_TYPES.map((t, i) => {
            const isSelected = t.value === type;
            return (
              <Button
                key={t.value}
                size="xs"
                justify="flex-start"
                variant={isSelected ? 'filled' : 'light'}
                color={isSelected ? 'green' : 'gray'}
                fw={isSelected ? 600 : 500}
                leftSection={
                  <t.icon
                    size={14}
                    color={
                      isSelected
                        ? undefined
                        : 'var(--mantine-color-green-filled)'
                    }
                  />
                }
                onClick={() => setType(t.value)}
                autoFocus={i === 0}
              >
                {t.label}
              </Button>
            );
          })}
        </SimpleGrid>
        <Textarea
          variant="filled"
          size="sm"
          autosize
          minRows={2}
          maxRows={4}
          placeholder={selected.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Group justify="flex-end" gap={6} wrap="nowrap">
          <Button size="xs" variant="light" color="gray" onClick={cancel}>
            Cancel
          </Button>
          <Button size="xs" onClick={submit}>
            Create
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
