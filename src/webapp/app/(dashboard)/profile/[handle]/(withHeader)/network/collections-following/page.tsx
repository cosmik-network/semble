import FollowingCollectionsContainer from '@/features/follows/containers/followingCollectionsContainer/FollowingCollectionsContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <FollowingCollectionsContainer handle={handle} />;
}
