import CollectionEmbedContainer from '@/features/collections/containers/collectionEmbedContainer/CollectionEmbedContainer';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  return <CollectionEmbedContainer handle={handle} rkey={rkey} />;
}
