import FollowersContainer from '@/features/follows/containers/followersContainer/FollowersContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <FollowersContainer handle={handle} />;
}
