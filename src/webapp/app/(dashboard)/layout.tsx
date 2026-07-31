import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Dashboard from '@/components/navigation/dashboard/Dashboard';
import { getSession } from '@/lib/auth/dal.server';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { makeServerQueryClient } from '@/lib/queryClient';

export const metadata: Metadata = {
  title: {
    template: '%s — Semble',
    default: 'Semble',
  },
};

// Must match useMyCollections({ limit: NAV_COLLECTIONS_LIMIT }) in
// CollectionsNavList and Composer, or the prefetch lands under a different key
// and the client refetches.
const NAV_COLLECTIONS_LIMIT = 30;

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  // The authed navbar renders CollectionsNavList and Composer, both of which run
  // useMyCollections — a suspense query over a DAL that authenticates through the
  // browser and cannot run during SSR. Fetch it here with the server DAL and hand
  // it down, per the Next.js guidance that Client Components receive
  // authenticated data from a parent Server Component.
  //
  // getSession() is memoized per request, so this reuses the root layout's call.
  const user = await getSession();

  const queryClient = makeServerQueryClient();

  if (user) {
    try {
      await queryClient.prefetchInfiniteQuery({
        queryKey: collectionKeys.mine(NAV_COLLECTIONS_LIMIT, undefined),
        initialPageParam: 1,
        queryFn: () =>
          getMyCollections({ page: 1, limit: NAV_COLLECTIONS_LIMIT }),
      });
    } catch {
      // Fall through to client fetching rather than failing the whole shell.
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard>{props.children}</Dashboard>
    </HydrationBoundary>
  );
}
