import { useSuspenseQuery } from '@tanstack/react-query';
import { getProfile } from '../dal';
import { profileKeys } from '../profileKeys';

interface Props {
  didOrHandle: string;
  includeStats?: boolean;
}

export default function useProfile(props: Props) {
  const profile = useSuspenseQuery({
    queryKey: profileKeys.profile(props.didOrHandle, props.includeStats),
    queryFn: () => getProfile(props.didOrHandle, props.includeStats),
  });

  return profile;
}
