import { ButtonGroup, Container, Stack } from '@mantine/core';
import AccountSummary from '../../components/accountSummary/AccountSummary';
import SettingItem from '../../components/settingItem/SettingItem';
import {
  IoMdColorPalette,
  IoMdHelpCircle,
  IoMdInformationCircle,
} from 'react-icons/io';
import SettingLogoutItem from '../../components/settingLogoutItem/SettingLogoutItem';
import { MdEmojiNature, MdScience } from 'react-icons/md';
import { Suspense } from 'react';
import AccountSummarySkeleton from '../../components/accountSummary/Skeleton.AccountSummary';

export default async function SettingsContainer() {
  return (
    <Container p={'xs'} size={'xs'}>
      <Stack gap={'xl'}>
        <Suspense fallback={<AccountSummarySkeleton />}>
          <AccountSummary />
        </Suspense>
        <Stack>
          <ButtonGroup orientation="vertical">
            <SettingItem href="/settings/appearance" icon={IoMdColorPalette}>
              Appearance
            </SettingItem>
            <SettingItem href="/settings/advanced" icon={MdScience}>
              Advanced
            </SettingItem>
            <SettingItem href="/settings/feed" icon={MdEmojiNature}>
              Feed
            </SettingItem>
            <SettingItem href="/settings/help" icon={IoMdHelpCircle}>
              Help
            </SettingItem>
            <SettingItem href="/settings/about" icon={IoMdInformationCircle}>
              About
            </SettingItem>
          </ButtonGroup>
          <SettingLogoutItem />
        </Stack>
      </Stack>
    </Container>
  );
}
