import ApiKeysContainer from '@/features/settings/containers/apiKeysContainer/ApiKeysContainer';
import ApiKeysContainerSkeleton from '@/features/settings/containers/apiKeysContainer/Skeleton.ApiKeysContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { Suspense } from 'react';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  return (
    <Suspense fallback={<ApiKeysContainerSkeleton />}>
      <ApiKeysContainer />
    </Suspense>
  );
}
