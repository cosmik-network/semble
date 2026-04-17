import ContributedToCollectionsContainer from '@/features/follows/containers/contributedToCollectionsContainer/ContributedToCollectionsContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <ContributedToCollectionsContainer handle={handle} />;
}
