import { Anchor, Group, Text } from '@mantine/core';
import { notifications, type NotificationData } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
import { useValue } from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import type {
  UndoToast as Toast,
  UndoableWrite,
} from '../../controller/connections';

const AUTO_CLOSE_MS = 6000;

const TITLES: Record<UndoableWrite['kind'], (label: string) => string> = {
  published: (label) => `Connected · ${label}`,
  retyped: (label) => `Changed to ${label}`,
  flipped: () => 'Direction flipped',
};

interface Props {
  undoToast: Toast;
  titleOf(url: string): string;
}

export default function UndoToast(props: Props) {
  const write = useValue(props.undoToast.current);
  const publishing = useValue(props.undoToast.publishing);
  const titleOf = props.titleOf;
  // A publishing toast becomes its write's in place, rather than closing
  const shown = useRef<{ id: string; publishing: boolean } | null>(null);

  useEffect(() => {
    const current = shown.current;
    const toast = publishing ?? write;
    const done = publishing ? null : write;
    if (!toast) {
      if (current) notifications.hide(current.id);
      shown.current = null;
      return;
    }

    const label =
      CONNECTION_TYPES.find((type) => type.value === toast.type)?.label ?? '';
    const options: NotificationData = {
      position: 'top-center',
      loading: !done,
      autoClose: done ? AUTO_CLOSE_MS : false,
      withCloseButton: !!done,
      title: done ? TITLES[done.kind](label) : `Connecting · ${label}`,
      message: (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
            {titleOf(toast.sourceUrl)} → {titleOf(toast.targetUrl)}
          </Text>
          {done && (
            <Anchor
              component="button"
              size="sm"
              fw={600}
              onClick={() => props.undoToast.undo()}
            >
              Undo
            </Anchor>
          )}
        </Group>
      ),
      onClose: () => {
        if (done && props.undoToast.current.get() === done) {
          props.undoToast.dismiss();
        }
      },
    };

    if (current?.publishing) {
      notifications.update({ ...options, id: current.id });
      shown.current = { id: current.id, publishing: !done };
    } else {
      if (current) notifications.hide(current.id);
      shown.current = { id: notifications.show(options), publishing: !done };
    }
  }, [publishing, write, props.undoToast, titleOf]);

  useEffect(
    () => () => {
      if (shown.current) notifications.hide(shown.current.id);
    },
    [],
  );

  return null;
}
