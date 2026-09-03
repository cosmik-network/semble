import ApiKeysContainer from '@/features/settings/containers/apiKeysContainer/ApiKeysContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  return (
    <Suspense
      fallback={
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      }
    >
      <ApiKeysContainer />
    </Suspense>
  );
}
