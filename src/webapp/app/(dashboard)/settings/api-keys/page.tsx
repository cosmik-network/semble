import ApiKeysContainer from '@/features/settings/containers/apiKeysContainer/ApiKeysContainer';
import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';

export default function Page() {
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
