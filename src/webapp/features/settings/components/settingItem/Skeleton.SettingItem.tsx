import { Button } from '@mantine/core';

export default function SettingItemSkeleton() {
  return (
    <Button
      variant="light"
      c={'gra'}
      w={'100%'}
      h={42}
      radius={'lg'}
      color="gray"
      my={1}
      loaderProps={{ type: 'dots' }}
      loading
    />
  );
}
