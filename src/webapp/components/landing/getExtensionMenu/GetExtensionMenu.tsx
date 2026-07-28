'use client';

import { Anchor, Image, Menu } from '@mantine/core';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';

export default function GetExtensionMenu() {
  return (
    <Menu shadow="sm">
      <Menu.Target>
        <Anchor component="button" fw={500} c="bright">
          Get Extension
        </Anchor>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component="a"
          href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
          target="_blank"
          rel="noopener noreferrer"
          leftSection={
            <Image src={ChromeIcon.src} alt="" w={16} h={16} fit="contain" />
          }
        >
          Chrome extension
        </Menu.Item>
        <Menu.Item
          component="a"
          href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
          target="_blank"
          rel="noopener noreferrer"
          leftSection={
            <Image src={FirefoxIcon.src} alt="" w={16} h={16} fit="contain" />
          }
        >
          Firefox extension
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
