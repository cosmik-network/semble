import { Container, Stack, ButtonGroup } from '@mantine/core';
import SettingItemSkeleton from '../../components/settingItem/Skeleton.SettingItem';

export default function HelpContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <ButtonGroup orientation="vertical">
          <SettingItemSkeleton />
          <SettingItemSkeleton />
          <SettingItemSkeleton />
        </ButtonGroup>
      </Stack>
    </Container>
  );
}
