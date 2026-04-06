import CollectionGalleryEmbedContainer from '@/features/collections/containers/collectionGalleryEmbedContainer/CollectionGalleryEmbedContainer';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
  searchParams: Promise<{ 'parts.page.mode'?: 'edit' | 'view' }>;
}

export default async function Page(props: Props) {
  const { rkey, handle } = await props.params;
  const searchParams = await props.searchParams;
  const mode = searchParams['parts.page.mode'] || 'view';

  return (
    <CollectionGalleryEmbedContainer handle={handle} rkey={rkey} mode={mode} />
  );
}
