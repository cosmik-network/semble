import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Dashboard from '@/components/navigation/dashboard/Dashboard';
import { getSession } from '@/lib/auth/dal.server';
import {
  getMyCollections,
  getOpenCollectionsWithContributor,
} from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { getFollowingCollections } from '@/features/follows/lib/dal.server';
import { followKeys } from '@/features/follows/lib/followKeys';
import {
  NAV_COLLECTIONS_LIMIT,
  COMPOSER_COLLECTIONS_LIMIT,
} from '@/features/collections/lib/constants';
import { getMyUrlCards } from '@/features/cards/lib/dal.server';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { NAV_CARDS_LIMIT } from '@/features/cards/lib/constants';
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
    // Awaited (in parallel) rather than streamed as pending promises: when an
    // un-awaited prefetch rejects (e.g. a transient ETIMEDOUT to the backend),
    // the rejected promise is serialized into the RSC payload and surfaces as
    // an unhandled Server Components render error — this layout sits above
    // every error boundary, so users get the bare "This page couldn't load"
    // screen. prefetchInfiniteQuery never rejects, so awaiting leaves a
    // failed query in error state, which is simply not dehydrated and the
    // client refetches it after hydration.
    const prefetches: Promise<void>[] = [];

    prefetches.push(
      queryClient.prefetchInfiniteQuery({
        queryKey: collectionKeys.mine(NAV_COLLECTIONS_LIMIT, undefined),
        initialPageParam: 1,
        queryFn: () =>
          getMyCollections({ page: 1, limit: NAV_COLLECTIONS_LIMIT }),
      }),
    );

    // Navbar mounts Composer (closed) on every page, and Composer's
    // collection picker is a suspense query. Without this seed it throws
    // NoSessionError during SSR (its client DAL cannot authenticate on the
    // server), which errors a streaming boundary and can hold the response
    // open until the function times out.
    prefetches.push(
      queryClient.prefetchInfiniteQuery({
        queryKey: collectionKeys.mine(COMPOSER_COLLECTIONS_LIMIT, undefined),
        initialPageParam: 1,
        queryFn: () =>
          getMyCollections({ page: 1, limit: COMPOSER_COLLECTIONS_LIMIT }),
      }),
    );

    prefetches.push(
      queryClient.prefetchInfiniteQuery({
        queryKey: followKeys.followingCollections(
          user.handle,
          NAV_COLLECTIONS_LIMIT,
        ),
        initialPageParam: 1,
        queryFn: () =>
          getFollowingCollections(user.handle, {
            page: 1,
            limit: NAV_COLLECTIONS_LIMIT,
          }),
      }),
    );

    prefetches.push(
      queryClient.prefetchInfiniteQuery({
        queryKey: collectionKeys.openWithContributor(
          user.handle,
          NAV_COLLECTIONS_LIMIT,
        ),
        initialPageParam: 1,
        queryFn: () =>
          getOpenCollectionsWithContributor({
            identifier: user.handle,
            page: 1,
            limit: NAV_COLLECTIONS_LIMIT,
          }),
      }),
    );

    prefetches.push(
      queryClient.prefetchInfiniteQuery({
        queryKey: cardKeys.mine(NAV_CARDS_LIMIT),
        initialPageParam: 1,
        queryFn: () => getMyUrlCards({ page: 1, limit: NAV_CARDS_LIMIT }),
      }),
    );

    await Promise.all(prefetches);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard>{props.children}</Dashboard>
    </HydrationBoundary>
  );
}
