import CollectionContainer from '@/features/collections/containers/collectionContainer/CollectionContainer';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  return <CollectionContainer handle={handle} rkey={rkey} />;
}
