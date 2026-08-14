'use client';

import type { ReactNode } from 'react';
import { Box, Card, Group, Menu, SimpleGrid } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { MdOutlineInstallMobile } from 'react-icons/md';
import { TbStackForward } from 'react-icons/tb';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';
import McpIcon from '@/assets/icons/mcp-icon.svg';
import type { InstallMilestoneField } from '../../lib/useOnboardingMilestones';
import OptionTile, {
  brandMark,
  EXTERNAL_LINK_PROPS,
  iconMark,
  OPTION_TILE_PROPS,
  OptionTileBody,
} from '../optionTile/OptionTile';

const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg';
const FIREFOX_EXTENSION_URL =
  'https://addons.mozilla.org/en-US/firefox/addon/semble/';
const MCP_DOCS_URL = 'https://docs.cosmik.network/semble-mcp';

interface InstallOption {
  href: string;
  mark: ReactNode;
  title: string;
  description: string;
  surface: InstallMilestoneField;
  external?: boolean;
  iosOnly?: boolean;
}

const OPTIONS: InstallOption[] = [
  {
    href: '/install-app',
    mark: iconMark(<MdOutlineInstallMobile />),
    title: 'Web app',
    description: 'Semble on your home screen',
    surface: 'pwaClicked',
  },
  {
    href: '/ios-shortcut',
    mark: iconMark(<TbStackForward />),
    title: 'iOS shortcut',
    description: 'Save from the share sheet',
    surface: 'iosShortcutClicked',
    iosOnly: true,
  },
  {
    href: MCP_DOCS_URL,
    mark: brandMark(McpIcon.src),
    title: 'MCP',
    description: 'Use Semble from Claude',
    surface: 'mcpClicked',
    external: true,
  },
];

interface Props {
  /** Runs before the browser follows the tile, which may leave this tab. */
  onSelect: (surface: InstallMilestoneField) => void;
}

export default function InstallOptions(props: Props) {
  const os = useOs();
  const visible = OPTIONS.filter((option) => !option.iosOnly || os === 'ios');

  const [firstTile, ...restTiles] = visible.map((option) => (
    <OptionTile
      key={option.href}
      href={option.href}
      mark={option.mark}
      title={option.title}
      description={option.description}
      external={option.external}
      onClick={() => props.onSelect(option.surface)}
    />
  ));

  const extensionTile = (
    <Menu
      key="extension"
      shadow="sm"
      position="bottom-start"
      width={220}
      withinPortal
    >
      <Menu.Target>
        <Card
          component="button"
          type="button"
          w={'100%'}
          ta="start"
          {...OPTION_TILE_PROPS}
        >
          <OptionTileBody
            mark={
              <Group gap={0} wrap="nowrap">
                {brandMark(ChromeIcon.src)}
                <Box ml={-10}>{brandMark(FirefoxIcon.src)}</Box>
              </Group>
            }
            title="Browser extension"
            description="Save from any page"
          />
        </Card>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          component="a"
          href={CHROME_EXTENSION_URL}
          {...EXTERNAL_LINK_PROPS}
          onClick={() => props.onSelect('browserExtensionClicked')}
          leftSection={brandMark(ChromeIcon.src, 16)}
        >
          Chrome
        </Menu.Item>
        <Menu.Item
          component="a"
          href={FIREFOX_EXTENSION_URL}
          {...EXTERNAL_LINK_PROPS}
          onClick={() => props.onSelect('browserExtensionClicked')}
          leftSection={brandMark(FirefoxIcon.src, 16)}
        >
          Firefox
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
      {firstTile}
      {extensionTile}
      {restTiles}
    </SimpleGrid>
  );
}
