import CollectionContributorsContainer from '@/features/collections/containers/collectionContributorsContainer/CollectionContributorsContainer';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';

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

  return <CollectionContributorsContainer collectionId={collection.id} />;
}
