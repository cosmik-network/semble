'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useTaggedItems from '../../lib/queries/useTaggedItems';
import TaggedItemsLayout from '../../components/taggedItemsLayout/TaggedItemsLayout';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedCollectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'collection',
      user: props.handleOrDid,
    });

  // CollectionCard links by AT-URI, which an unpublished collection lacks.
  const collections = data.pages
    .flatMap((page) => page.collections ?? [])
    .filter((collection) => collection.uri);

  return (
    <TaggedItemsLayout
      tag={props.tag}
      handleOrDid={props.handleOrDid}
      count={collections.length}
      hasMore={!!hasNextPage}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          showAuthor
        />
      ))}
    </TaggedItemsLayout>
  );
}
