import CollectionFollowersContainer from '@/features/follows/containers/collectionFollowersContainer/CollectionFollowersContainer';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Fragment } from 'react';
import { truncateText } from '@/lib/utils/text';

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
      <Header>
        <BackButton href={`/profile/${handle}/collections/${rkey}`}>
          {truncateText(collection.name, 20)}
        </BackButton>
      </Header>
      <CollectionFollowersContainer
        collectionId={collection.id}
        collectionName={collection.name}
        handle={handle}
        rkey={rkey}
      />
    </Fragment>
  );
}
