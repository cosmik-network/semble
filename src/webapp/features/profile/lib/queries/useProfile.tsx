import {
  useSuspenseQuery,
  useQuery,
  UseQueryResult,
  UseSuspenseQueryResult,
} from '@tanstack/react-query';
import { getProfile } from '../dal';
import { profileKeys } from '../profileKeys';

type ProfileData = Awaited<ReturnType<typeof getProfile>>;

interface PropsWithStats {
  didOrHandle: string;
  includeStats: true;
}

interface PropsWithoutStats {
  didOrHandle: string;
  includeStats?: false;
}

export default function useProfile(
  props: PropsWithStats,
): UseQueryResult<ProfileData>;
export default function useProfile(
  props: PropsWithoutStats,
): UseSuspenseQueryResult<ProfileData>;
export default function useProfile(props: PropsWithStats | PropsWithoutStats) {
  if (props.includeStats) {
    // Non-suspense: stats are progressive — tabs render immediately, counts fill in async
    return useQuery({
      queryKey: profileKeys.profile(props.didOrHandle, true),
      queryFn: () => getProfile(props.didOrHandle, true),
    });
  }

  return useSuspenseQuery({
    queryKey: profileKeys.profile(props.didOrHandle, props.includeStats),
    queryFn: () => getProfile(props.didOrHandle, props.includeStats),
  });
}
