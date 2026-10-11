import ApiKeysContainer from '@/features/settings/containers/apiKeysContainer/ApiKeysContainer';
import ApiKeysContainerSkeleton from '@/features/settings/containers/apiKeysContainer/Skeleton.ApiKeysContainer';
import ClientOnly from '@/components/utils/ClientOnly';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { Suspense } from 'react';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  // ApiKeysContainer's useApiKeys is an authed suspense query with no
  // server-side seed — rendered during SSR it throws NoSessionError.
  return (
    <ClientOnly fallback={<ApiKeysContainerSkeleton />}>
      <Suspense fallback={<ApiKeysContainerSkeleton />}>
        <ApiKeysContainer />
      </Suspense>
    </ClientOnly>
  );
}
