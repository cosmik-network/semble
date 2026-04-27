import CollectionsContainer from '@/features/collections/containers/collectionsContainer/CollectionsContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <CollectionsContainer handle={handle} />;
}
