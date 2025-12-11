import { ButtonGroup, Container, Stack } from '@mantine/core';
import AccountSummary from '../../components/accountSummary/AccountSummary';
import SettingItem from '../../components/settingItem/SettingItem';
import {
  IoMdColorPalette,
  IoMdHelpCircle,
  IoMdInformationCircle,
} from 'react-icons/io';
import SettingLogoutItem from '../../components/settingLogoutItem/SettingLogoutItem';

export default function SettingsContainer() {
  return (
    <Container p={'xs'} size={'xs'}>
      <Stack gap={'xl'}>
        <AccountSummary />
        <Stack>
          <ButtonGroup orientation="vertical">
            <SettingItem href="/settings/appearance" icon={IoMdColorPalette}>
              Appearance
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
