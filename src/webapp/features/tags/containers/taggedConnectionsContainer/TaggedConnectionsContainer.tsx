'use client';

import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';
import useTaggedItems from '../../lib/queries/useTaggedItems';
import TaggedItemsLayout from '../../components/taggedItemsLayout/TaggedItemsLayout';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedConnectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'connection',
      user: props.handleOrDid,
    });

  const connections = data.pages.flatMap((page) => page.connections ?? []);

  return (
    <TaggedItemsLayout
      tag={props.tag}
      handleOrDid={props.handleOrDid}
      count={connections.length}
      hasMore={!!hasNextPage}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      {connections.map((connection) => (
        <ProfileConnectionItem
          key={connection.connection.id}
          connection={connection}
          curator={connection.connection.curator}
        />
      ))}
    </TaggedItemsLayout>
  );
}
