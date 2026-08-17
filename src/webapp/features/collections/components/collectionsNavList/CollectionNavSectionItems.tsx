'use client';

import { Collection } from '@semble/types';
import CollectionNavItem from '../collectionNavItem/CollectionNavItem';
import useMyCollections from '../../lib/queries/useMyCollections';
import useFollowingCollections from '@/features/follows/lib/queries/useFollowingCollections';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';
import { NAV_COLLECTIONS_LIMIT } from '../../lib/constants';
import { getRecordKey } from '@/lib/utils/atproto';

function CollectionNavItemsList(props: { collections: Collection[] }) {
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
  const { data } = useMyCollections({ limit: NAV_COLLECTIONS_LIMIT });

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return <CollectionNavItemsList collections={collections} />;
}

export function FollowingCollectionsNavItems(props: { identifier: string }) {
  const { data } = useFollowingCollections({
    identifier: props.identifier,
    limit: NAV_COLLECTIONS_LIMIT,
  });

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return <CollectionNavItemsList collections={collections} />;
}

export function ContributedCollectionsNavItems(props: { identifier: string }) {
  const { data } = useOpenCollectionsWithContributor({
    identifier: props.identifier,
    limit: NAV_COLLECTIONS_LIMIT,
  });

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return <CollectionNavItemsList collections={collections} />;
}
