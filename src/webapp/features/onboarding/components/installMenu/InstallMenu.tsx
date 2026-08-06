'use client';

import { Button, Menu } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { FiChrome } from 'react-icons/fi';
import { MdOutlineInstallMobile } from 'react-icons/md';
import { TbBrandFirefox, TbRobot, TbStackForward } from 'react-icons/tb';
import { LinkMenuItem } from '@/components/link/MantineLink';

const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg';
const FIREFOX_EXTENSION_URL =
  'https://addons.mozilla.org/en-US/firefox/addon/semble/';
const MCP_DOCS_URL = 'https://docs.cosmik.network/semble-mcp';

interface Props {
  /**
   * Runs before the browser follows any item. Marks onboarding complete —
   * picking an install target is the last step, whether or not the click
   * navigates away from this tab.
   */
  onSelect: () => void;
}

export default function InstallMenu(props: Props) {
  // Mantine resolves this after mount, so it is 'undetermined' on the server
  // and on the first client render. That is the point: the iOS item appears
  // once we know the device, and the markup matches on hydration.
  const os = useOs();

  return (
    <Menu shadow="sm" position="bottom-start" width={240}>
      <Menu.Target>
        <Button variant="default" radius={'xl'}>
          Install Semble
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <LinkMenuItem
          href="/install-app"
          leftSection={<MdOutlineInstallMobile size={16} />}
          onClick={props.onSelect}
        >
          App on your device
        </LinkMenuItem>

        <Menu.Item
          component="a"
          href={CHROME_EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<FiChrome size={16} />}
          onClick={props.onSelect}
        >
          Chrome extension
        </Menu.Item>

        <Menu.Item
          component="a"
          href={FIREFOX_EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<TbBrandFirefox size={16} />}
          onClick={props.onSelect}
        >
          Firefox extension
        </Menu.Item>

        {os === 'ios' && (
          <LinkMenuItem
            href="/ios-shortcut"
            leftSection={<TbStackForward size={16} />}
            onClick={props.onSelect}
          >
            iOS shortcut
          </LinkMenuItem>
        )}

        <Menu.Item
          component="a"
          href={MCP_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<TbRobot size={16} />}
          onClick={props.onSelect}
        >
          MCP for AI assistants
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
