import { Container, Stack, ButtonGroup } from '@mantine/core';
import { FaDiscord } from 'react-icons/fa6';
import SettingItem from '../../components/settingItem/SettingItem';
import {
  MdBugReport,
  MdMenuBook,
  MdOutlineCollectionsBookmark,
  MdOutlineInstallMobile,
} from 'react-icons/md';
import { TbStackForward } from 'react-icons/tb';

export default function HelpContainer() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <ButtonGroup orientation="vertical">
          <SettingItem
            href="/bookmarklet"
            openInNewTab
            icon={MdOutlineCollectionsBookmark}
          >
            Install bookmarklet
          </SettingItem>
          <SettingItem href="/ios-shortcut" openInNewTab icon={TbStackForward}>
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
          <SettingItem
            href="https://docs.cosmik.network/semble"
            openInNewTab
            icon={MdMenuBook}
          >
            Semble Docs
          </SettingItem>
          <SettingItem
            href="https://tangled.org/@cosmik.network/semble/issues"
            openInNewTab
            icon={MdBugReport}
          >
            Submit an issue
          </SettingItem>
          <SettingItem
            href="https://discord.gg/SHvvysb73e"
            openInNewTab
            icon={FaDiscord}
          >
            Join our discord community
          </SettingItem>
        </ButtonGroup>
      </Stack>
    </Container>
  );
}
