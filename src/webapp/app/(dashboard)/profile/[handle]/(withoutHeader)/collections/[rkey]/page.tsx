import CollectionContainer from '@/features/collections/containers/collectionContainer/CollectionContainer';
import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Fragment } from 'react';
import { truncateText } from '@/lib/utils/text';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  return (
    <Fragment>
      <Header>
        <BackButton href={`/profile/${handle}/collections`}>
          {`@${truncateText(handle, 20)}`}
        </BackButton>
      </Header>
      <CollectionContainer handle={handle} rkey={rkey} />
    </Fragment>
  );
}
