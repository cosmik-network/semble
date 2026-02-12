import FollowingCollectionsContainer from '@/features/follows/containers/followingCollectionsContainer/FollowingCollectionsContainer';
import { getProfile } from '@/features/profile/lib/dal';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;
  const profile = await getProfile(handle);

  return <FollowingCollectionsContainer identifier={profile.id} />;
}
