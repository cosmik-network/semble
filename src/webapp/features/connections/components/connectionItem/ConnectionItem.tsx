import type { ConnectionForUrl } from '@semble/types';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import ConnectionStatus from './ConnectionStatus';

interface Props {
  connectionForUrl: ConnectionForUrl;
  direction: 'forward' | 'backward';
}

export default function ConnectionItem(props: Props) {
  const urlView = props.connectionForUrl.url;

  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <ConnectionStatus
        connection={props.connectionForUrl.connection}
        direction={props.direction}
      />
      <UrlCard
        id={urlView.url}
        url={urlView.url}
        cardContent={urlView.metadata}
        urlLibraryCount={urlView.urlLibraryCount}
        urlIsInLibrary={urlView.urlInLibrary ?? false}
      />
    </Stack>
  );
}
