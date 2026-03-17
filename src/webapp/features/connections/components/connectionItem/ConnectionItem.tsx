import type { ConnectionWithSourceAndTarget } from '@semble/types';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import ConnectionStatus from './ConnectionStatus';

interface Props {
  connection: ConnectionWithSourceAndTarget;
  direction: 'forward' | 'backward';
  onEdit?: () => void;
}

export default function ConnectionItem(props: Props) {
  // For forward connections, show the target; for backward connections, show the source
  const urlView =
    props.direction === 'forward'
      ? props.connection.target
      : props.connection.source;

  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <ConnectionStatus
        connection={props.connection.connection}
        source={props.connection.source}
        target={props.connection.target}
        direction={props.direction}
        onEdit={props.onEdit}
      />
      <UrlCard
        id={urlView.url}
        url={urlView.url}
        cardContent={urlView.metadata}
        urlLibraryCount={urlView.urlLibraryCount}
        urlIsInLibrary={urlView.urlInLibrary ?? false}
        urlConnectionCount={urlView.urlConnectionCount ?? 0}
      />
    </Stack>
  );
}
