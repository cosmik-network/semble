'use client';

import { Collection } from '@semble/types';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import { useMyCollectionsInfinite } from '../../lib/queries/useMyCollections';
import { useFollowingCollectionsInfinite } from '@/features/follows/lib/queries/useFollowingCollections';
import { useOpenCollectionsWithContributorInfinite } from '../../lib/queries/useOpenCollectionsWithContributor';
import LibraryNavSectionSkeleton from '@/features/library/components/libraryNav/Skeleton.LibraryNavSection';
import { NAV_COLLECTIONS_LIMIT } from '../../lib/constants';
import { getRecordKey } from '@/lib/utils/atproto';

function CollectionNavItemsList(props: {
  collections: Collection[] | undefined;
  isPending: boolean;
  error: Error | null;
}) {
  if (props.error) throw props.error;
  if (props.isPending || !props.collections) {
    return <LibraryNavSectionSkeleton />;
  }

  return (
    <>
      {props.collections.map((collection) => (
        <CollectionNavItem
          key={collection.id}
          name={collection.name}
          url={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!)}`}
          cardCount={collection.cardCount}
          accessType={collection.accessType}
          uri={collection.uri}
        />
      ))}
    </>
  );
}

export function MyCollectionsNavItems() {
  const { data, error, isPending } = useMyCollectionsInfinite({
    limit: NAV_COLLECTIONS_LIMIT,
  });

  return (
    <CollectionNavItemsList
      collections={data?.pages.flatMap((page) => page.collections ?? [])}
      isPending={isPending}
      error={error}
    />
  );
}

export function FollowingCollectionsNavItems(props: { identifier: string }) {
  const { data, error, isPending } = useFollowingCollectionsInfinite({
    identifier: props.identifier,
    limit: NAV_COLLECTIONS_LIMIT,
  });

  return (
    <CollectionNavItemsList
      collections={data?.pages.flatMap((page) => page.collections ?? [])}
      isPending={isPending}
      error={error}
    />
  );
}

export function ContributedCollectionsNavItems(props: { identifier: string }) {
  const { data, error, isPending } = useOpenCollectionsWithContributorInfinite({
    identifier: props.identifier,
    limit: NAV_COLLECTIONS_LIMIT,
  });

  return (
    <CollectionNavItemsList
      collections={data?.pages.flatMap((page) => page.collections ?? [])}
      isPending={isPending}
      error={error}
    />
  );
}
