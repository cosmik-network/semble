import CollectionGalleryEmbedContainer from '@/features/collections/containers/collectionGalleryEmbedContainer/CollectionGalleryEmbedContainer';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;

  return <CollectionGalleryEmbedContainer handle={handle} rkey={rkey} />;
}
