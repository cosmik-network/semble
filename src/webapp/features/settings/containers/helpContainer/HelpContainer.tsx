import { Container, Stack, ButtonGroup } from '@mantine/core';
import { FaDiscord } from 'react-icons/fa6';
import SettingItem from '../../components/settingItem/SettingItem';
import { MdBugReport, MdMenuBook } from 'react-icons/md';

export default function HelpContainer() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
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
