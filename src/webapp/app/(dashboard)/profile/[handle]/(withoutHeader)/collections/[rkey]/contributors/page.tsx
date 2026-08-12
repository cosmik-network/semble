import CollectionContributorsContainer from '@/features/collections/containers/collectionContributorsContainer/CollectionContributorsContainer';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import { isNotFoundApiError } from '@/api-client/errors';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  // Fetch the collection to get its ID and name
  const collection = await getCollectionPageByAtUri({
    recordKey: rkey,
    handle,
  }).catch((error: unknown) => {
    // Unresolvable handle / missing collection → render the not-found page.
    if (isNotFoundApiError(error, 'COLLECTION_NOT_FOUND')) notFound();
    throw error;
  });

  return <CollectionContributorsContainer collectionId={collection.id} />;
}
