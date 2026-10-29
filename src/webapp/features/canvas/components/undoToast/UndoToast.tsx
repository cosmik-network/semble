import { Anchor, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useValue } from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import type {
  UndoToast as Toast,
  UndoableWrite,
} from '../../controller/connections';
import { canvasKeys } from '../../lib/canvasKeys';
import type { LinkInfo } from '../../server/canvasServer';

const AUTO_CLOSE_MS = 6000;

const TITLES: Record<UndoableWrite['kind'], (label: string) => string> = {
  published: (label) => `Connected · ${label}`,
  retyped: (label) => `Changed to ${label}`,
  flipped: () => 'Direction flipped',
};

interface Props {
  undoToast: Toast;
}

export default function UndoToast(props: Props) {
  const queryClient = useQueryClient();
  const write = useValue(props.undoToast.current);

  useEffect(() => {
    if (!write) return;
    // The toast renders outside the board's providers, so titles are read now
    const titleOf = (url: string) =>
      queryClient.getQueryData<LinkInfo>(canvasKeys.link(url))?.metadata
        .title || url;
    const label =
      CONNECTION_TYPES.find((type) => type.value === write.type)?.label ?? '';
    const id = notifications.show({
      position: 'top-center',
      autoClose: AUTO_CLOSE_MS,
      title: TITLES[write.kind](label),
      message: (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
            {titleOf(write.sourceUrl)} → {titleOf(write.targetUrl)}
          </Text>
          <Anchor
            component="button"
            size="sm"
            fw={600}
            onClick={() => props.undoToast.undo()}
          >
            Undo
          </Anchor>
        </Group>
      ),
      onClose: () => {
        if (props.undoToast.current.get() === write) {
          props.undoToast.dismiss();
        }
      },
    });
    return () => {
      notifications.hide(id);
    };
  }, [write, props.undoToast, queryClient]);

  return null;
}
