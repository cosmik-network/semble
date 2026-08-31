import TaggedItemsContainer from '@/features/tags/containers/taggedItemsContainer/TaggedItemsContainer';

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ handle?: string }>;
}

export default async function Page(props: Props) {
  const { tag } = await props.params;
  const { handle } = await props.searchParams;
  const decoded = decodeURIComponent(tag).toLowerCase();

  return (
    <TaggedItemsContainer
      tag={decoded}
      itemType="collection"
      handleOrDid={handle}
    />
  );
}
