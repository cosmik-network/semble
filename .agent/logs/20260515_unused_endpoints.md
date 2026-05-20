we check if the method on the ApiClient is used anywhere, and then recursively check where else it's used. It it turns out it's not used anywhere, this is dead code. The below example is for the getFollowingCount api client method. Called in a dal.ts file and then that get's called in a useFollowingCount.tsx file. Which ultimately wasn't used anywhere (and the hook file and below lines of code could be safely removed.)

```typescript
// src/webapp/features/follows/lib/queries/useFollowingCount.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { getFollowingCount } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
}

export default function useFollowingCount({ identifier }: Props) {
  const query = useSuspenseQuery({
    queryKey: followKeys.followingCount(identifier),
    queryFn: () => getFollowingCount(identifier),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  return query;
}

// src/webapp/features/follows/lib/dal.ts
export const getFollowingCount = cache(async (identifier: string) => {
  const client = createSembleClient();
  const response = await client.getFollowingCount({ identifier });
  return response;
});


// src/webapp/api-client/ApiClient.ts
  async getFollowingCount(
    params: GetFollowingCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.queryClient.getFollowingCount(params);
  }

// src/webapp/api-client/clients/QueryClient.ts
  async getFollowingCount(
    params: GetFollowingCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      `/api/users/${params.identifier}/following/count`,
    );
  }
```
