import FollowingContainer from '@/features/follows/containers/followingContainer/FollowingContainer';
import { getProfile } from '@/features/profile/lib/dal';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;
  const profile = await getProfile(handle);

  return <FollowingContainer identifier={profile.id} />;
}
