import FollowersContainer from '@/features/follows/containers/followersContainer/FollowersContainer';
import { getProfile } from '@/features/profile/lib/dal.server';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;
  const profile = await getProfile(handle);

  return (
    <FollowersContainer
      identifier={profile.id}
      profileName={profile.name}
      handle={handle}
    />
  );
}
