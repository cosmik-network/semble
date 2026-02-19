import CollectionFollowersContainer from '@/features/follows/containers/collectionFollowersContainer/CollectionFollowersContainer';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  // Fetch the collection to get its ID and name
  const collection = await getCollectionPageByAtUri({
    recordKey: rkey,
    handle,
  });

  return (
    <Fragment>
      <CollectionFollowersContainer
        collectionId={collection.id}
        collectionName={collection.name}
        handle={handle}
        rkey={rkey}
      />
    </Fragment>
  );
}
