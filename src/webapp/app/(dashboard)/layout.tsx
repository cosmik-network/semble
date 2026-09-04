import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Dashboard from '@/components/navigation/dashboard/Dashboard';
import { getSession } from '@/lib/auth/dal.server';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { NAV_COLLECTIONS_LIMIT } from '@/features/collections/lib/constants';
import { makeServerQueryClient } from '@/lib/queryClient';

export const metadata: Metadata = {
  title: {
    template: '%s — Semble',
    default: 'Semble',
  },
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  const user = await getSession();
  const queryClient = makeServerQueryClient();

  if (user) {
    // Not awaited so the shell streams while it loads.
    void queryClient.prefetchInfiniteQuery({
      queryKey: collectionKeys.mine(NAV_COLLECTIONS_LIMIT, undefined),
      initialPageParam: 1,
      queryFn: () =>
        getMyCollections({ page: 1, limit: NAV_COLLECTIONS_LIMIT }),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard>{props.children}</Dashboard>
    </HydrationBoundary>
  );
}
