import { ActionIcon, Button, Group, Tooltip } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { stopEventPropagation, TLShapeId } from 'tldraw';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { TbPlugConnected } from 'react-icons/tb';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import type { UrlStatus } from '@/features/cards/lib/queries/useUrlStatus';
import { useCanvasSession } from '../../lib/canvasSession';
import styles from './CardShapeActions.module.css';

interface Props {
  shapeId: TLShapeId;
  url: string;
  saved: boolean;
  hasNote: boolean;
  noteOpen: boolean;
  onToggleNote: () => void;
}

// The webapp card's save, connect and note buttons, acting on the canvas
export default function CardShapeActions(props: Props) {
  const session = useCanvasSession();
  // Same key as the webapp's card status, so saves and connections refresh it
  const status = useQuery({
    queryKey: cardKeys.urlStatus(props.url),
    queryFn: async (): Promise<UrlStatus> => {
      const data = await getUrlMetadata({ url: props.url, includeStats: true });
      return {
        libraryCount: data.stats?.libraryCount ?? 0,
        connectionCount: data.stats?.connections.all.total ?? 0,
        inLibrary: data.urlInLibrary,
        isConnected: data.urlIsConnected,
      };
    },
    staleTime: 5 * 60_000,
  });
  const libraryCount = status.data?.libraryCount ?? 0;
  const connectionCount = status.data?.connectionCount ?? 0;
  const saved = props.saved;
  const savedIcon = saved ? <IoMdCheckmark size={18} /> : <FiPlus size={18} />;

  return (
    <Group
      className={styles.root}
      gap="xs"
      mt="xs"
      onPointerDown={stopEventPropagation}
    >
      <Tooltip label="Save or update" withArrow withinPortal={false}>
        <Button
          variant="light"
          color="gray"
          size="xs"
          radius="xl"
          leftSection={libraryCount > 0 ? savedIcon : undefined}
          onClick={() => session.addToCollectionShapeId.set(props.shapeId)}
        >
          {libraryCount || savedIcon}
        </Button>
      </Tooltip>
      <Tooltip label="Connect to another card" withArrow withinPortal={false}>
        <Button
          variant="light"
          color={status.data?.isConnected ? 'green' : 'gray'}
          size="xs"
          radius="xl"
          leftSection={
            connectionCount > 0 ? <TbPlugConnected size={15} /> : undefined
          }
          onClick={() => session.connectShapeId.set(props.shapeId)}
        >
          {connectionCount || <TbPlugConnected size={15} />}
        </Button>
      </Tooltip>
      {props.hasNote && (
        <Tooltip
          label={props.noteOpen ? 'Hide note' : 'View note'}
          withArrow
          withinPortal={false}
        >
          <ActionIcon
            variant={props.noteOpen ? 'filled' : 'light'}
            color="gray"
            radius="xl"
            aria-label="Toggle note"
            onClick={props.onToggleNote}
          >
            <MdOutlineStickyNote2 />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
