import FollowingContainer from '@/features/follows/containers/followingContainer/FollowingContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <FollowingContainer handle={handle} />;
}
