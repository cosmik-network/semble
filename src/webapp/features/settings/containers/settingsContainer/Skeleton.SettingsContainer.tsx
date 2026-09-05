import { Container, Skeleton, Stack } from '@mantine/core';
import AccountSummarySkeleton from '../../components/accountSummary/Skeleton.AccountSummary';

function SettingItemsSkeleton(props: { count: number }) {
  return (
    <Stack gap={2}>
      {Array.from({ length: props.count }, (_, i) => (
        <Skeleton key={i} h={42} radius="lg" />
      ))}
    </Stack>
  );
}

export default function SettingsContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <AccountSummarySkeleton />
        <Stack gap="lg">
          <SettingItemsSkeleton count={2} />
          <SettingItemsSkeleton count={3} />
          <SettingItemsSkeleton count={1} />
          <SettingItemsSkeleton count={2} />
          <SettingItemsSkeleton count={1} />
        </Stack>
      </Stack>
    </Container>
  );
}
