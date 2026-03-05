import { useQuery } from '@tanstack/react-query';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { getProfile } from '@/features/profile/lib/dal';

interface Props {
  handle: string | undefined;
  enabled?: boolean;
}

/**
 * Fetches user profile data for graph node popups
 * Wraps the profile query with graph-specific configuration
 */
export default function useGraphNodeUser({ handle, enabled = true }: Props) {
  return useQuery({
    queryKey: handle ? profileKeys.profile(handle) : ['graph', 'user', 'empty'],
    queryFn: () => {
      if (!handle) throw new Error('Handle is required');
      return getProfile(handle);
    },
    enabled: enabled && !!handle,
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
    retry: 1, // Only retry once for popup data
    refetchOnWindowFocus: false, // Don't refetch on focus for popup data
  });
}
