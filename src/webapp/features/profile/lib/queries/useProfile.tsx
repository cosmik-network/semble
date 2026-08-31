import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { getProfile } from '../dal';
import { profileKeys } from '../profileKeys';

interface Props {
  didOrHandle: string;
}

export default function useProfile(props: Props) {
  return useSuspenseQuery({
    queryKey: profileKeys.profile(props.didOrHandle),
    queryFn: () => getProfile(props.didOrHandle),
  });
}

// Non-suspense: stats are progressive — tabs render immediately, counts fill in async
export function useProfileWithStats(props: Props) {
  return useQuery({
    queryKey: profileKeys.profile(props.didOrHandle, true),
    queryFn: () => getProfile(props.didOrHandle, true),
  });
}
