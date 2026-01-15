import { ButtonGroup, Container, Stack } from '@mantine/core';
import AccountSummarySkeleton from '../../components/accountSummary/Skeleton.AccountSummary';
import SettingItemSkeleton from '../../components/settingItem/Skeleton.SettingItem';

export default function SettingsContainerSkeleton() {
  return (
    <Container p={'xs'} size={'xs'}>
      <Stack gap={'xl'}>
        <AccountSummarySkeleton />
        <Stack>
          <ButtonGroup orientation="vertical">
            <SettingItemSkeleton />
            <SettingItemSkeleton />
            <SettingItemSkeleton />
            <SettingItemSkeleton />
          </ButtonGroup>
          <SettingItemSkeleton />
        </Stack>
      </Stack>
    </Container>
  );
}
