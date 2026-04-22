'use client';

import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import TabItem from './TabItem';
import useCollection from '../../lib/queries/useCollection';
import { getCollectionContributors } from '../../lib/dal';
import { collectionKeys } from '../../lib/collectionKeys';
import { CollectionAccessType } from '@semble/types';

interface Props {
  handle: string;
  rkey: string;
  basePath: string;
}

function ContributorTabInner(props: Props) {
  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const collection = data.pages[0];

  const { data: contributors } = useQuery({
    queryKey: [
      ...collectionKeys.collection(collection.id),
      'contributors-count',
    ],
    queryFn: () => getCollectionContributors(collection.id, { limit: 1 }),
    enabled: collection.accessType === CollectionAccessType.OPEN,
  });

  if (collection.accessType !== CollectionAccessType.OPEN) {
    return null;
  }

  return (
    <TabItem
      value="contributors"
      href={`${props.basePath}/contributors`}
      count={contributors?.pagination.totalCount}
    >
      Contributors
    </TabItem>
  );
}

export default function ContributorTab(props: Props) {
  return (
    <Suspense>
      <ContributorTabInner {...props} />
    </Suspense>
  );
}
