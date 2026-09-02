import { ButtonGroup, Container, Stack } from '@mantine/core';
import AccountSummary from '../../components/accountSummary/AccountSummary';
import SettingItem from '../../components/settingItem/SettingItem';
import SettingItemGroup from '../../components/settingItemGroup/SettingItemGroup';
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
import { FaBluesky } from 'react-icons/fa6';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { getServerSession } from '@/lib/auth/dal.server';

export default async function SettingsContainer() {
  const [featureFlags, session] = await Promise.all([
    getServerFeatureFlags(),
    getServerSession(),
  ]);
  // Only a definitive guest loses the auth-only items; 'unresolved' keeps them
  // and lets the client repair the session.
  const isGuest = session.status === 'guest';

  return (
    <Container p={'xs'} size={'xs'}>
      <Stack gap={'xl'}>
        <AccountSummary />
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
            {!isGuest && (
              <SettingItem href="/settings/api-keys" icon={MdKey}>
                API Keys
              </SettingItem>
            )}
            {!isGuest && featureFlags.bskyFollows && (
              <SettingItem href="/settings/bluesky-follows" icon={FaBluesky}>
                Bluesky follows
              </SettingItem>
            )}
            {/*<SettingItem href="/settings/data-sync" icon={MdSync}>
              Data sync
            </SettingItem>*/}
          </ButtonGroup>
          <SettingItemGroup
            label="Install"
            icon={<MdOutlineInstallMobile size={26} />}
          >
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
          </SettingItemGroup>
          <ButtonGroup orientation="vertical">
            <SettingItem href="/settings/help" icon={IoMdHelpCircle}>
              Help
            </SettingItem>
            <SettingItem href="/settings/about" icon={IoMdInformationCircle}>
              About
            </SettingItem>
          </ButtonGroup>
          {!isGuest && <SettingLogoutItem />}
        </Stack>
      </Stack>
    </Container>
  );
}
