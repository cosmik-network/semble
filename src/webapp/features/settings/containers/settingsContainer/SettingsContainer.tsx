import { ButtonGroup, Container, Stack } from '@mantine/core';
import AccountSummary from '../../components/accountSummary/AccountSummary';
import SettingItem from '../../components/settingItem/SettingItem';
import {
  IoMdColorPalette,
  IoMdHelpCircle,
  IoMdInformationCircle,
} from 'react-icons/io';
import SettingLogoutItem from '../../components/settingLogoutItem/SettingLogoutItem';
import {
  MdEmojiNature,
  MdKey,
  MdScience,
  MdSync,
  MdOutlineCollectionsBookmark,
  MdOutlineInstallMobile,
} from 'react-icons/md';
import { TbStackForward, TbBrandFirefox } from 'react-icons/tb';
import { FiChrome } from 'react-icons/fi';
import { Suspense } from 'react';
import AccountSummarySkeleton from '../../components/accountSummary/Skeleton.AccountSummary';

export default async function SettingsContainer() {
  return (
    <Container p={'xs'} size={'xs'}>
      <Stack gap={'xl'}>
        <Suspense fallback={<AccountSummarySkeleton />}>
          <AccountSummary />
        </Suspense>
        <Stack gap={'lg'}>
          <ButtonGroup orientation="vertical">
            <SettingItem href="/settings/appearance" icon={IoMdColorPalette}>
              Appearance
            </SettingItem>
            <SettingItem href="/settings/feed" icon={MdEmojiNature}>
              Feed
            </SettingItem>
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
            <SettingItem href="/settings/advanced" icon={MdScience}>
              Advanced
            </SettingItem>
            <SettingItem href="/settings/api-keys" icon={MdKey}>
              API Keys
            </SettingItem>
            {/*<SettingItem href="/settings/data-sync" icon={MdSync}>
              Data sync
            </SettingItem>*/}
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
            <SettingItem
              href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
              openInNewTab
              icon={FiChrome}
            >
              Chrome extension
            </SettingItem>
            <SettingItem
              href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
              openInNewTab
              icon={TbBrandFirefox}
            >
              Firefox extension
            </SettingItem>
            <SettingItem
              href="/bookmarklet"
              openInNewTab
              icon={MdOutlineCollectionsBookmark}
            >
              Install bookmarklet
            </SettingItem>
            <SettingItem
              href="/ios-shortcut"
              openInNewTab
              icon={TbStackForward}
            >
              Install iOS shortcut
            </SettingItem>
            <SettingItem
              href="/install-app"
              openInNewTab
              icon={MdOutlineInstallMobile}
            >
              Install the app
            </SettingItem>
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
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
