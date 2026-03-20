'use client';

import { Suspense } from 'react';
import TabItem from './TabItem';
import useCollection from '../../lib/queries/useCollection';
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

  if (collection.accessType !== CollectionAccessType.OPEN) {
    return null;
  }

  return (
    <TabItem value="contributors" href={`${props.basePath}/contributors`}>
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
